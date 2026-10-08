import csv
import io
import secrets
import string
from copy import deepcopy
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..constants import DEFAULT_THEME
from ..database import get_db
from ..models import utcnow
from ..serializers import form_detail_to_dict, form_summary_to_dict, question_to_dict, response_to_dict

router = APIRouter(prefix="/api", tags=["forms"])

SLUG_ALPHABET = string.ascii_letters + string.digits


def generate_slug(length=11):
    return "".join(secrets.choice(SLUG_ALPHABET) for _ in range(length))


def get_form_or_404(db: Session, form_id: int) -> models.Form:
    form = db.get(models.Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found.")
    return form


def get_question_or_404(db: Session, question_id: int) -> models.Question:
    question = db.get(models.Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found.")
    return question


def get_default_creator(db: Session) -> models.Creator:
    """The assignment simplifies auth: we assume a single, always-logged-in creator."""
    creator = db.query(models.Creator).first()
    if creator is None:
        creator = models.Creator(name="Default Creator", email="creator@example.com")
        db.add(creator)
        db.flush()
    return creator


def completed_response_count(db: Session, form_id: int) -> int:
    return (
        db.query(models.Response)
        .filter(models.Response.form_id == form_id, models.Response.is_complete.is_(True))
        .count()
    )


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------


@router.get("/forms")
def list_forms(db: Session = Depends(get_db)):
    creator = get_default_creator(db)
    return [form_summary_to_dict(form, completed_response_count(db, form.id)) for form in creator.forms]


@router.post("/forms", status_code=201)
def create_form(payload: schemas.FormCreate, db: Session = Depends(get_db)):
    creator = get_default_creator(db)
    form = models.Form(
        creator_id=creator.id,
        title=payload.title.strip() or "Untitled form",
        slug=generate_slug(),
        theme=dict(DEFAULT_THEME),
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form_detail_to_dict(form, 0)


@router.get("/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    return form_detail_to_dict(form, completed_response_count(db, form.id))


@router.patch("/forms/{form_id}")
def update_form(form_id: int, payload: schemas.FormUpdate, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    fields = [
        "title",
        "welcome_title",
        "welcome_description",
        "welcome_button_text",
        "thank_you_title",
        "thank_you_description",
        "theme",
        "settings",
    ]
    for field in fields:
        value = getattr(payload, field)
        if value is not None:
            setattr(form, field, value)
    if form.title.strip() == "":
        form.title = "Untitled form"
    db.commit()
    db.refresh(form)
    return form_detail_to_dict(form, completed_response_count(db, form.id))


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    db.delete(form)
    db.commit()
    return None


@router.post("/forms/{form_id}/duplicate", status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    source = get_form_or_404(db, form_id)
    copy = models.Form(
        creator_id=source.creator_id,
        title=f"{source.title} (copy)",
        slug=generate_slug(),
        status="draft",
        welcome_title=source.welcome_title,
        welcome_description=source.welcome_description,
        welcome_button_text=source.welcome_button_text,
        thank_you_title=source.thank_you_title,
        thank_you_description=source.thank_you_description,
        theme=dict(source.theme or {}),
        settings=dict(source.settings or {}),
    )
    db.add(copy)
    db.flush()

    # Copy questions/choices first, tracking old→new id maps, then rebuild
    # each config so logic-jump rules point at the copy's own ids.
    question_id_map: dict[int, int] = {}
    choice_id_maps: dict[int, dict[int, int]] = {}
    copied: list[tuple[models.Question, models.Question]] = []

    for question in source.questions:
        new_question = models.Question(
            form_id=copy.id,
            qtype=question.qtype,
            title=question.title,
            description=question.description,
            required=question.required,
            position=question.position,
        )
        db.add(new_question)
        db.flush()
        question_id_map[question.id] = new_question.id
        choice_id_maps[question.id] = {}
        for choice in question.choices:
            new_choice = models.Choice(
                question_id=new_question.id, label=choice.label, position=choice.position
            )
            db.add(new_choice)
            db.flush()
            choice_id_maps[question.id][choice.id] = new_choice.id
        copied.append((question, new_question))

    for old_question, new_question in copied:
        config = deepcopy(old_question.config or {})
        logic = config.get("logic")
        if isinstance(logic, list):
            config["logic"] = [
                {
                    "choice_id": choice_id_maps[old_question.id].get(
                        rule["choice_id"], rule["choice_id"]
                    ),
                    "target_question_id": question_id_map.get(
                        rule["target_question_id"], rule["target_question_id"]
                    ),
                }
                for rule in logic
                if isinstance(rule, dict)
            ]
        if config.get("always_jump"):
            config["always_jump"] = question_id_map.get(
                config["always_jump"], config["always_jump"]
            )
        new_question.config = config

    db.commit()
    db.refresh(copy)
    return form_detail_to_dict(copy, 0)


@router.post("/forms/{form_id}/publish")
def publish_form(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    if not form.questions:
        raise HTTPException(status_code=400, detail="Add at least one question before publishing.")
    if not any(q.title.strip() for q in form.questions):
        raise HTTPException(status_code=400, detail="Every question needs some text before publishing.")
    form.status = "published"
    form.published_at = utcnow()
    db.commit()
    db.refresh(form)
    return form_detail_to_dict(form, completed_response_count(db, form.id))


@router.post("/forms/{form_id}/unpublish")
def unpublish_form(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    form.status = "draft"
    db.commit()
    db.refresh(form)
    return form_detail_to_dict(form, completed_response_count(db, form.id))


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------


@router.post("/forms/{form_id}/questions", status_code=201)
def create_question(form_id: int, payload: schemas.QuestionCreate, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    position = max((q.position for q in form.questions), default=-1) + 1
    question = models.Question(
        form_id=form.id,
        qtype=payload.qtype,
        title=payload.title,
        description=payload.description,
        required=payload.required,
        position=position,
        config=dict(payload.config or {}),
    )
    db.add(question)
    db.flush()
    for i, label in enumerate(payload.choices or []):
        db.add(models.Choice(question_id=question.id, label=label, position=i))
    db.commit()
    db.refresh(question)
    return question_to_dict(question)


@router.patch("/questions/{question_id}")
def update_question(question_id: int, payload: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    question = get_question_or_404(db, question_id)
    if payload.title is not None:
        question.title = payload.title
    if payload.description is not None:
        question.description = payload.description
    if payload.required is not None:
        question.required = payload.required
    if payload.config is not None:
        merged = dict(question.config or {})
        merged.update(payload.config)
        question.config = merged
    if payload.choices is not None:
        existing = sorted(question.choices, key=lambda c: c.position)
        for i, label in enumerate(payload.choices):
            if i < len(existing):
                existing[i].label = label
                existing[i].position = i
            else:
                db.add(models.Choice(question_id=question.id, label=label, position=i))
        for j in range(len(payload.choices), len(existing)):
            db.delete(existing[j])
    db.commit()
    db.refresh(question)
    return question_to_dict(question)


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = get_question_or_404(db, question_id)
    form = question.form
    db.delete(question)
    db.flush()
    for i, remaining in enumerate(sorted(form.questions, key=lambda q: q.position)):
        remaining.position = i
    db.commit()
    return None


@router.put("/forms/{form_id}/questions/order")
def reorder_questions(form_id: int, payload: schemas.QuestionOrderUpdate, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    questions = {q.id: q for q in form.questions}
    if sorted(payload.question_ids) != sorted(questions.keys()):
        raise HTTPException(status_code=400, detail="Question list doesn’t match this form.")
    for i, question_id in enumerate(payload.question_ids):
        questions[question_id].position = i
    db.commit()
    return [question_to_dict(questions[qid]) for qid in payload.question_ids]


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


@router.get("/forms/{form_id}/responses")
def list_responses(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    responses = (
        db.query(models.Response)
        .filter(models.Response.form_id == form.id)
        .order_by(models.Response.id.desc())
        .all()
    )
    return [response_to_dict(r) for r in responses]


@router.get("/forms/{form_id}/responses/{response_id}")
def get_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    response = db.get(models.Response, response_id)
    if response is None or response.form_id != form_id:
        raise HTTPException(status_code=404, detail="Response not found.")
    return response_to_dict(response)


@router.delete("/forms/{form_id}/responses/{response_id}", status_code=204)
def delete_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    response = db.get(models.Response, response_id)
    if response is None or response.form_id != form_id:
        raise HTTPException(status_code=404, detail="Response not found.")
    db.delete(response)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Stats & export
# ---------------------------------------------------------------------------


@router.get("/forms/{form_id}/stats")
def form_stats(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    completed = [r for r in form.responses if r.is_complete]
    started = len(form.responses)
    completion_rate = round(100 * len(completed) / started, 1) if started else 0.0

    durations = [
        (r.submitted_at - r.started_at).total_seconds()
        for r in completed
        if r.submitted_at and r.started_at
    ]
    average_seconds = round(mean(durations), 1) if durations else None

    answers_by_question = {q.id: [] for q in form.questions}
    for response in completed:
        for answer in response.answers:
            if answer.question_id in answers_by_question:
                answers_by_question[answer.question_id].append(answer)

    question_stats = []
    for question in form.questions:
        answers = answers_by_question[question.id]
        stat = {
            "question_id": question.id,
            "qtype": question.qtype,
            "title": question.title,
            "required": question.required,
            "answered": len(answers),
            "skipped": len(completed) - len(answers),
        }
        if question.qtype in ("multiple_choice", "dropdown"):
            counts = {choice.id: 0 for choice in question.choices}
            for answer in answers:
                for selection in answer.selections:
                    if selection.choice_id in counts:
                        counts[selection.choice_id] += 1
            stat["choices"] = [
                {"choice_id": choice.id, "label": choice.label, "count": counts[choice.id]}
                for choice in sorted(question.choices, key=lambda c: c.position)
            ]
        elif question.qtype == "yes_no":
            yes = sum(1 for a in answers if (a.value or "").lower() == "yes")
            stat["yes_no"] = {"yes": yes, "no": len(answers) - yes}
        elif question.qtype == "rating":
            ratings = []
            for a in answers:
                try:
                    ratings.append(int(float(a.value)))
                except (TypeError, ValueError):
                    continue
            if ratings:
                max_rating = int((question.config or {}).get("max_rating") or 5)
                distribution = {str(i): 0 for i in range(1, max_rating + 1)}
                for value in ratings:
                    distribution[str(value)] = distribution.get(str(value), 0) + 1
                stat["rating"] = {"average": round(mean(ratings), 1), "distribution": distribution}
        elif question.qtype == "number":
            numbers = []
            for a in answers:
                try:
                    numbers.append(float(a.value))
                except (TypeError, ValueError):
                    continue
            if numbers:
                stat["number"] = {
                    "average": round(mean(numbers), 1),
                    "min": min(numbers),
                    "max": max(numbers),
                }
        else:
            values = [a.value for a in answers if a.value]
            stat["text"] = {"count": len(values), "latest": values[-3:]}
        question_stats.append(stat)

    return {
        "form_id": form.id,
        "total_responses": len(completed),
        "started": started,
        "completion_rate": completion_rate,
        "average_seconds": average_seconds,
        "questions": question_stats,
    }


@router.get("/forms/{form_id}/export.csv")
def export_responses_csv(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    questions = form.questions
    completed = sorted(
        (r for r in form.responses if r.is_complete),
        key=lambda r: r.submitted_at or r.started_at,
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at", "Status"] + [q.title for q in questions])
    for response in completed:
        answers = {a.question_id: a for a in response.answers}
        row = [
            response.id,
            response.submitted_at.isoformat(sep=" ") if response.submitted_at else "",
            "completed" if response.is_complete else "partial",
        ]
        for question in questions:
            answer = answers.get(question.id)
            if answer is None:
                row.append("")
            elif question.qtype in ("multiple_choice", "dropdown"):
                label_by_id = {choice.id: choice.label for choice in question.choices}
                row.append("; ".join(label_by_id.get(s.choice_id, "") for s in answer.selections))
            else:
                row.append(answer.value or "")
        writer.writerow(row)

    filename = f"{form.title.replace(' ', '-').lower()[:60]}-responses.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
