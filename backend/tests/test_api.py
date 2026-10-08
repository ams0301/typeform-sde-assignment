"""End-to-end API tests against a fresh, seeded database (see conftest.py)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_form(client, title="Test form"):
    return client.post("/api/forms", json={"title": title}).json()


def make_question(client, form_id, payload):
    return client.post(f"/api/forms/{form_id}/questions", json=payload).json()


# ---------------------------------------------------------------------------
# Seed & basics
# ---------------------------------------------------------------------------


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_seeded_data(client):
    forms = client.get("/api/forms").json()
    assert len(forms) == 4
    assert sum(1 for form in forms if form["status"] == "published") == 3
    feedback = next(form for form in forms if form["slug"] == "feedback-nimbus-x7")
    assert feedback["response_count"] == 14
    assert feedback["question_count"] == 8


def test_form_crud_roundtrip(client):
    created = client.post("/api/forms", json={"title": "  My test form  "}).json()
    assert created["title"] == "My test form"
    assert created["status"] == "draft"
    form_id = created["id"]

    patched = client.patch(
        f"/api/forms/{form_id}", json={"title": "", "theme": {"background": "#101010"}}
    ).json()
    assert patched["title"] == "Untitled form"
    assert patched["theme"]["background"] == "#101010"

    duplicate = client.post(f"/api/forms/{form_id}/duplicate").json()
    assert duplicate["title"] == "Untitled form (copy)"
    assert duplicate["status"] == "draft"
    assert duplicate["slug"] != created["slug"]

    assert client.delete(f"/api/forms/{duplicate['id']}").status_code == 204
    assert client.delete(f"/api/forms/{form_id}").status_code == 204
    assert client.get(f"/api/forms/{form_id}").status_code == 404


def test_question_lifecycle_and_reorder(client):
    form = make_form(client, "Question flow")
    form_id = form["id"]

    first = make_question(
        client, form_id, {"qtype": "multiple_choice", "title": "Pick", "choices": ["A", "B"]}
    )
    assert [choice["label"] for choice in first["choices"]] == ["A", "B"]
    second = make_question(client, form_id, {"qtype": "rating", "title": "Rate"})
    assert second["position"] == 1

    updated = client.patch(
        f"/api/questions/{first['id']}",
        json={"required": True, "choices": ["A", "B", "C"]},
    ).json()
    assert updated["required"] is True
    assert [choice["label"] for choice in updated["choices"]] == ["A", "B", "C"]

    reordered = client.put(
        f"/api/forms/{form_id}/questions/order",
        json={"question_ids": [second["id"], first["id"]]},
    ).json()
    assert [question["id"] for question in reordered] == [second["id"], first["id"]]
    detail = client.get(f"/api/forms/{form_id}").json()
    assert [question["position"] for question in detail["questions"]] == [0, 1]

    # An order payload that doesn't match the form's questions is rejected.
    assert (
        client.put(
            f"/api/forms/{form_id}/questions/order", json={"question_ids": [999]}
        ).status_code
        == 400
    )

    assert client.delete(f"/api/questions/{first['id']}").status_code == 204
    remaining = client.get(f"/api/forms/{form_id}").json()["questions"]
    assert [question["id"] for question in remaining] == [second["id"]]
    assert remaining[0]["position"] == 0

    client.delete(f"/api/forms/{form_id}")


# ---------------------------------------------------------------------------
# Publish & public visibility
# ---------------------------------------------------------------------------


def test_publish_guards_and_public_visibility(client):
    form = make_form(client, "Pub")
    form_id = form["id"]

    # Can't publish without questions.
    assert client.post(f"/api/forms/{form_id}/publish").status_code == 400

    question = make_question(client, form_id, {"qtype": "short_text", "title": ""})
    # Can't publish while a question has no text.
    assert client.post(f"/api/forms/{form_id}/publish").status_code == 400

    client.patch(f"/api/questions/{question['id']}", json={"title": "Hello?"})
    published = client.post(f"/api/forms/{form_id}/publish").json()
    assert published["status"] == "published"

    public = client.get(f"/api/public/forms/{published['slug']}").json()
    assert public["questions"][0]["title"] == "Hello?"

    client.post(f"/api/forms/{form_id}/unpublish")
    assert client.get(f"/api/public/forms/{published['slug']}").status_code == 404
    assert client.get("/api/public/forms/no-such-slug").status_code == 404

    client.delete(f"/api/forms/{form_id}")


def make_public_form(client, title, questions):
    form = make_form(client, title)
    form_id = form["id"]
    created = [make_question(client, form_id, payload) for payload in questions]
    for question in created:
        if not question["title"]:
            client.patch(f"/api/questions/{question['id']}", json={"title": "Fill me in"})
    published = client.post(f"/api/forms/{form_id}/publish").json()
    return form_id, published["slug"], created


def test_submit_validation(client):
    form_id, slug, questions = make_public_form(
        client,
        "Validation form",
        [
            {"qtype": "email", "title": "Email?", "required": True},
            {"qtype": "number", "title": "How many?", "required": True, "config": {"min": 0, "max": 10}},
            {"qtype": "rating", "title": "Rate us", "required": True},
        ],
    )
    all_ids = [question["id"] for question in questions]

    started = client.post(f"/api/public/forms/{slug}/start").json()
    assert started["response_id"] > 0

    invalid = client.post(
        f"/api/public/forms/{slug}/submit",
        json={
            "response_id": started["response_id"],
            "answers": [
                {"question_id": all_ids[0], "value": "not-an-email"},
                {"question_id": all_ids[1], "value": "42"},
                {"question_id": all_ids[2], "value": "9"},
            ],
            "path": all_ids,
        },
    )
    assert invalid.status_code == 422
    errors = invalid.json()["detail"]["answers"]
    assert len(errors) == 3

    missing_required = client.post(
        f"/api/public/forms/{slug}/submit",
        json={"answers": [], "path": all_ids},
    )
    assert missing_required.status_code == 422

    valid = client.post(
        f"/api/public/forms/{slug}/submit",
        json={
            "response_id": started["response_id"],
            "answers": [
                {"question_id": all_ids[0], "value": "person@example.com"},
                {"question_id": all_ids[1], "value": "7"},
                {"question_id": all_ids[2], "value": "5"},
            ],
            "path": all_ids,
        },
    )
    assert valid.status_code == 201
    # The started (partial) row is reused and marked complete.
    assert valid.json()["response_id"] == started["response_id"]
    stored = client.get(f"/api/forms/{form_id}/responses/{started['response_id']}").json()
    assert stored["is_complete"] is True
    assert stored["submitted_at"] is not None

    client.delete(f"/api/forms/{form_id}")


def test_logic_path_exempts_skipped_required(client):
    """A required question skipped by a logic jump must not block submission."""
    form_id, slug, questions = make_public_form(
        client,
        "Logic form",
        [
            {"qtype": "dropdown", "title": "Issue?", "required": True, "choices": ["Billing", "Bug"]},
            {"qtype": "short_text", "title": "Tell us more", "required": True},
            {"qtype": "email", "title": "Email?", "required": True},
        ],
    )
    q_issue, q_more, q_email = questions
    bug_choice = next(choice for choice in q_issue["choices"] if choice["label"] == "Bug")

    client.patch(
        f"/api/questions/{q_issue['id']}",
        json={
            "config": {
                "logic": [
                    {"choice_id": bug_choice["id"], "target_question_id": q_email["id"]}
                ]
            }
        },
    )

    # Bug path: jumps straight from the dropdown to email, skipping q_more.
    ok = client.post(
        f"/api/public/forms/{slug}/submit",
        json={
            "answers": [
                {"question_id": q_issue["id"], "choice_ids": [bug_choice["id"]]},
                {"question_id": q_email["id"], "value": "dev@example.com"},
            ],
            "path": [q_issue["id"], q_email["id"]],
        },
    )
    assert ok.status_code == 201

    # Normal path shown, but the required short-text question is left empty.
    blocked = client.post(
        f"/api/public/forms/{slug}/submit",
        json={
            "answers": [
                {"question_id": q_issue["id"], "choice_ids": [q_issue["choices"][0]["id"]]},
                {"question_id": q_email["id"], "value": "dev@example.com"},
            ],
            "path": [q_issue["id"], q_more["id"], q_email["id"]],
        },
    )
    assert blocked.status_code == 422
    assert blocked.json()["detail"]["answers"][0]["question_id"] == q_more["id"]

    client.delete(f"/api/forms/{form_id}")


def test_duplicate_remaps_logic_references(client):
    """Duplication must rewrite logic rules to the copy's own question/choice ids."""
    form_id, slug, questions = make_public_form(
        client,
        "Logic original",
        [
            {"qtype": "dropdown", "title": "Issue?", "required": True, "choices": ["A", "B"]},
            {"qtype": "email", "title": "Email?", "required": True},
        ],
    )
    q_issue, q_email = questions
    choice_b = q_issue["choices"][1]
    client.patch(
        f"/api/questions/{q_issue['id']}",
        json={
            "config": {
                "logic": [
                    {"choice_id": choice_b["id"], "target_question_id": q_email["id"]}
                ]
            }
        },
    )

    duplicate = client.post(f"/api/forms/{form_id}/duplicate").json()
    copy_detail = client.get(f"/api/forms/{duplicate['id']}").json()
    copy_issue, copy_email = copy_detail["questions"]
    copy_choice_b = next(
        choice for choice in copy_issue["choices"] if choice["label"] == "B"
    )

    rule = copy_issue["config"]["logic"][0]
    assert rule["choice_id"] == copy_choice_b["id"]
    assert rule["target_question_id"] == copy_email["id"]
    assert rule["choice_id"] != choice_b["id"]
    assert rule["target_question_id"] != q_email["id"]

    client.delete(f"/api/forms/{form_id}")
    client.delete(f"/api/forms/{duplicate['id']}")


def test_stats_csv_and_completion_rate(client):
    form_id, slug, questions = make_public_form(
        client,
        "Stats form",
        [
            {"qtype": "multiple_choice", "title": "Favourite?", "required": True, "choices": ["X", "Y"]},
            {"qtype": "rating", "title": "Rate?", "required": True},
        ],
    )
    choice_x, choice_y = questions[0]["choices"]
    submit = lambda answers: client.post(
        f"/api/public/forms/{slug}/submit",
        json={"answers": answers, "path": [q["id"] for q in questions]},
    )
    assert submit(
        [
            {"question_id": questions[0]["id"], "choice_ids": [choice_x["id"]]},
            {"question_id": questions[1]["id"], "value": "4"},
        ]
    ).status_code == 201
    assert submit(
        [
            {"question_id": questions[0]["id"], "choice_ids": [choice_y["id"]]},
            {"question_id": questions[1]["id"], "value": "5"},
        ]
    ).status_code == 201
    # A started-but-abandoned response for completion-rate tracking.
    client.post(f"/api/public/forms/{slug}/start")

    stats = client.get(f"/api/forms/{form_id}/stats").json()
    assert stats["total_responses"] == 2
    assert stats["started"] == 3
    assert stats["completion_rate"] == 66.7
    assert stats["average_seconds"] is not None
    choice_stats = stats["questions"][0]["choices"]
    assert [item["count"] for item in choice_stats] == [1, 1]
    rating_stats = stats["questions"][1]["rating"]
    assert rating_stats["average"] == 4.5

    csv_response = client.get(f"/api/forms/{form_id}/export.csv")
    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    body = csv_response.text.splitlines()
    assert "Favourite?" in body[0] and "Rate?" in body[0]
    assert len(body) == 3  # header + 2 completed responses

    client.delete(f"/api/forms/{form_id}")
