"""Seed the database with a default creator, demo forms and realistic responses."""

from datetime import datetime, timedelta, timezone

from .database import SessionLocal
from .models import Answer, AnswerSelection, Choice, Creator, Form, Question, Response


def _now_minus(days=0, hours=0):
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)


def _add_question(db, form, qtype, title, description="", required=False, choices=None, config=None):
    question = Question(
        form_id=form.id,
        qtype=qtype,
        title=title,
        description=description,
        required=required,
        position=len(form.questions),
        config=dict(config or {}),
    )
    db.add(question)
    db.flush()
    for i, label in enumerate(choices or []):
        db.add(Choice(question_id=question.id, label=label, position=i))
    db.flush()
    return question


def _add_response(db, form, when, items, complete=True, duration_minutes=3):
    """items: list of (question, value) or (question, [choice, ...]) pairs."""
    response = Response(
        form_id=form.id,
        is_complete=complete,
        started_at=when - timedelta(minutes=duration_minutes),
        submitted_at=when if complete else None,
    )
    db.add(response)
    db.flush()
    for question, data in items:
        answer = Answer(response_id=response.id, question_id=question.id)
        if isinstance(data, list):
            answer.value = None
            db.add(answer)
            db.flush()
            for choice in data:
                db.add(AnswerSelection(answer_id=answer.id, choice_id=choice.id))
        else:
            answer.value = data
            db.add(answer)
    db.flush()
    return response


def _seed_feedback_form(db, creator):
    theme = {
        "background": "#F5F1E8",
        "text": "#1A1A1A",
        "button": "#111111",
        "button_text": "#FFFFFF",
        "font": "grotesk",
    }
    form = Form(
        creator_id=creator.id,
        title="Customer Feedback Survey",
        slug="feedback-nimbus-x7",
        status="published",
        welcome_title="Hey there 👋",
        welcome_description=(
            "Thanks for taking a minute to tell us how we're doing. "
            "Eight quick questions, tops — and every answer gets read."
        ),
        welcome_button_text="Let's go",
        thank_you_title="Thank you, {{name}} 🙌",
        thank_you_description="Your feedback just made our day. We'll put it to good use — promise.",
        theme=theme,
        published_at=_now_minus(days=6, hours=2),
    )
    db.add(form)
    db.flush()

    q_name = _add_question(db, form, "short_text", "First things first — what's your name?", required=True)
    q_email = _add_question(db, form, "email", "And the best email to reach you at?", required=True)
    q_rating = _add_question(
        db, form, "rating", "Overall, how would you rate your experience with Nimbus?", required=True, config={"max_rating": 5}
    )
    q_hear = _add_question(
        db,
        form,
        "multiple_choice",
        "How did you first hear about us?",
        required=True,
        choices=["A friend or colleague", "Google search", "Instagram or TikTok", "A podcast", "Read about us somewhere"],
    )
    q_industry = _add_question(
        db,
        form,
        "dropdown",
        "Which industry are you working in?",
        choices=["Technology", "Education", "Healthcare", "Finance", "Retail", "Manufacturing", "Something else"],
    )
    q_recommend = _add_question(db, form, "yes_no", "Would you recommend us to a friend?", required=True)
    q_nps = _add_question(
        db, form, "number", "How likely are you to recommend Nimbus to a colleague? (0–100)", required=True, config={"min": 0, "max": 100}
    )
    q_extra = _add_question(db, form, "long_text", "Anything else you'd like us to know? We read every single answer.")

    names = [
        "Priya Sharma", "Rahul Verma", "Ananya Iyer", "Karan Mehta", "Sneha Kulkarni",
        "Arjun Nair", "Divya Menon", "Vikram Malhotra", "Neha Gupta", "Aditya Rao",
        "Ishita Bose", "Manav Kapoor", "Tanya Joshi", "Rohan Das",
    ]
    ratings = [5, 4, 5, 3, 5, 4, 5, 5, 4, 5, 4, 3, 5, 4]
    hear_idx = [0, 1, 2, 0, 3, 1, 2, 0, 4, 2, 1, 3, 0, 2]
    industry_idx = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 0]
    recommend = [True, True, True, False, True, True, True, True, False, True, True, True, True, True]
    nps = [10, 8, 9, 6, 10, 7, 9, 8, 5, 9, 7, 6, 10, 8]
    domains = ["gmail.com", "outlook.com", "yahoo.com"]
    comments = [
        "The mobile app feels noticeably faster after the last update — nice work. A dark mode would be the cherry on top.",
        "Really happy with Nimbus overall. Your support team replied within minutes when I got stuck.",
        "The pricing feels a bit steep for how much I use it, but the core experience is rock solid.",
        "Onboarding was smooth — I was up and running in about ten minutes. The templates are a great touch.",
        "It would be great to see integrations with the tools we already use day to day.",
        "Honestly, it just works. I barely think about it, which is the highest compliment I can give.",
        "The new dashboard is beautiful. It took me a minute to find the export button, though.",
        "I've already recommended Nimbus to three people. Keep the updates coming!",
        "The weekly summary email is the one feature I didn't know I needed.",
    ]

    for i, name in enumerate(names):
        first, last = name.split(" ", 1)
        email = f"{first.lower()}.{last.split()[0].lower()}@{domains[i % 3]}"
        items = [
            (q_name, name),
            (q_email, email),
            (q_rating, str(ratings[i])),
            (q_hear, [q_hear.choices[hear_idx[i]]]),
            (q_industry, [q_industry.choices[industry_idx[i]]]),
            (q_recommend, "yes" if recommend[i] else "no"),
            (q_nps, str(nps[i])),
        ]
        if i < len(comments):
            items.append((q_extra, comments[i]))
        _add_response(db, form, _now_minus(days=i // 4, hours=3 + (i % 4) * 5), items, duration_minutes=2 + (i % 3))

    for i, name in enumerate(["Devika Rao", "Farhan Qureshi", "Meghna Suresh"]):
        _add_response(
            db,
            form,
            _now_minus(days=1, hours=i * 4),
            [(q_name, name), (q_rating, "4")],
            complete=False,
            duration_minutes=1,
        )
    return form


def _seed_ph_form(db, creator):
    theme = {
        "background": "#17233F",
        "text": "#F2F4F8",
        "button": "#F2B33D",
        "button_text": "#17233F",
        "font": "grotesk",
    }
    form = Form(
        creator_id=creator.id,
        title="Product Hunt Launch — PostHunt",
        slug="posthunt-launch",
        status="published",
        welcome_title="You made it to the end of the internet 🧲",
        welcome_description=(
            "Kidding — thanks for checking out today's Product Hunt launch. "
            "Five quick questions and we'll get out of your way."
        ),
        welcome_button_text="I'm in",
        thank_you_title="You, hunter, are a legend 🏆",
        thank_you_description="That's everything. Thanks for helping us make the next launch even better.",
        theme=theme,
        published_at=_now_minus(days=2),
    )
    db.add(form)
    db.flush()

    q_name = _add_question(db, form, "short_text", "What should we call you, hunter?", required=True)
    q_source = _add_question(
        db,
        form,
        "multiple_choice",
        "Where did you find today's launch?",
        required=True,
        choices=["The Product Hunt homepage", "A link on X", "A friend sent it to me", "Just clicked something"],
        config={"multiple_selection": True},
    )
    q_design = _add_question(db, form, "rating", "How would you rate the launch page design?", required=True, config={"max_rating": 5})
    q_plan = _add_question(
        db, form, "dropdown", "Which plan are you most likely to try?", choices=["Free", "Pro", "Business", "Not sure yet"]
    )
    q_video = _add_question(db, form, "yes_no", "Did the demo video convince you?")
    q_improve = _add_question(db, form, "short_text", "One thing we could do better next launch?")

    names = ["Marcus Chen", "Alina Petrova", "Jonas Weber", "Maya Krishnan", "Tom Okafor", "Lena Fischer", "Diego Alvarez", "Grace Liu", "Sam Whitaker"]
    sources = [[0], [1], [2], [0, 1], [3], [1], [0], [2], [1]]
    design = [5, 4, 5, 4, 3, 5, 4, 5, 4]
    plans = [1, 0, 1, 3, 0, 1, 2, 1, 0]
    video = [True, True, False, True, True, True, False, True, True]
    improve = [
        "Loved the launch video — maybe add captions for muted scrolling.",
        "The pricing page could load faster on mobile.",
        "",
        "A dark mode for the dashboard would be sweet.",
        "",
        "More GIFs. Always more GIFs.",
        "",
        "Maybe pin the changelog link higher on the page.",
        "",
    ]
    for i, name in enumerate(names):
        email_user = name.split(" ")[0].lower()
        items = [
            (q_name, name),
            (q_source, [q_source.choices[j] for j in sources[i]]),
            (q_design, str(design[i])),
            (q_plan, [q_plan.choices[plans[i]]]),
            (q_video, "yes" if video[i] else "no"),
        ]
        if improve[i]:
            items.append((q_improve, improve[i]))
        _add_response(db, form, _now_minus(hours=5 + i * 7), items, duration_minutes=2 + (i % 4))

    _add_response(
        db,
        form,
        _now_minus(hours=2),
        [(q_name, "Ravi Menon"), (q_source, [q_source.choices[1]])],
        complete=False,
        duration_minutes=1,
    )
    return form


def _seed_rsvp_form(db, creator):
    theme = {
        "background": "#EAF3EE",
        "text": "#1A1A1A",
        "button": "#111111",
        "button_text": "#FFFFFF",
        "font": "grotesk",
    }
    form = Form(
        creator_id=creator.id,
        title="Team Offsite — Goa RSVP",
        slug="goa-rsvp",
        status="draft",
        theme=theme,
    )
    db.add(form)
    db.flush()

    _add_question(db, form, "short_text", "What's your name?", required=True)
    _add_question(
        db,
        form,
        "dropdown",
        "Are you joining us in Goa?",
        required=True,
        choices=["Count me in", "I'll join remotely", "Can't make it"],
    )
    _add_question(db, form, "number", "How many days will you join us for? (1–3)", required=True, config={"min": 1, "max": 3})
    _add_question(
        db,
        form,
        "multiple_choice",
        "Any dietary preferences?",
        choices=["No restrictions", "Vegetarian", "Vegan", "Jain", "Allergies — I'll note them"],
        config={"multiple_selection": True},
    )
    _add_question(db, form, "long_text", "Anything we should keep in mind while planning?")
    return form


def _seed_support_form(db, creator):
    """Demonstrates logic jumps: the first question routes respondents."""
    theme = {
        "background": "#FFFFFF",
        "text": "#1A1A1A",
        "button": "#0E7A4A",
        "button_text": "#FFFFFF",
        "font": "grotesk",
    }
    form = Form(
        creator_id=creator.id,
        title="Nimbus Support — What's up?",
        slug="nimbus-support",
        status="published",
        welcome_title="Nimbus support, at your service 🛠️",
        welcome_description="Tell us what's going on and we'll get you to the right place. Two minutes, tops.",
        welcome_button_text="Get help",
        thank_you_title="We're on it 💪",
        thank_you_description="Our team will get back to you within one business day. Keep an eye on your inbox for a confirmation.",
        theme=theme,
        published_at=_now_minus(days=10),
    )
    db.add(form)
    db.flush()

    q_issue = _add_question(
        db,
        form,
        "dropdown",
        "What can we help you with today?",
        required=True,
        choices=["I have a billing question", "I found a bug", "I have a feature idea", "Something else"],
    )
    q_severity = _add_question(db, form, "rating", "Ouch — how bad is the bug?", required=True, config={"max_rating": 5})
    q_feature = _add_question(db, form, "long_text", "Tell us about the feature you'd love to see.", required=True)
    q_plan = _add_question(
        db, form, "dropdown", "Which plan are you currently on?", required=True, choices=["Free", "Pro", "Business"]
    )
    q_email = _add_question(db, form, "email", "What's the best email to follow up?", required=True)

    q_issue.config = {
        "logic": [
            {"choice_id": q_issue.choices[1].id, "target_question_id": q_severity.id},
            {"choice_id": q_issue.choices[2].id, "target_question_id": q_feature.id},
            {"choice_id": q_issue.choices[0].id, "target_question_id": q_plan.id},
            {"choice_id": q_issue.choices[3].id, "target_question_id": q_email.id},
        ]
    }
    q_severity.config = {"always_jump": q_email.id}
    q_feature.config = {"always_jump": q_email.id}
    q_plan.config = {"always_jump": q_email.id}

    def email_for(name):
        return f"{name.split()[0].lower()}@{['gmail.com', 'proton.me', 'outlook.com'][len(name) % 3]}"

    responses = [
        ("Marcus Webb", [(q_issue, [q_issue.choices[1]]), (q_severity, "4"), (q_email, email_for("Marcus Webb"))]),
        ("Sofia Ricci", [(q_issue, [q_issue.choices[1]]), (q_severity, "2"), (q_email, email_for("Sofia Ricci"))]),
        ("Liang Chen", [(q_issue, [q_issue.choices[2]]), (q_feature, "A simple Slack integration would save us hours every week."), (q_email, email_for("Liang Chen"))]),
        ("Priyanka Reddy", [(q_issue, [q_issue.choices[2]]), (q_feature, "Bulk export to CSV — the finance team asks for it monthly."), (q_email, email_for("Priyanka Reddy"))]),
        ("Dan Novak", [(q_issue, [q_issue.choices[0]]), (q_plan, [q_plan.choices[2]]), (q_email, email_for("Dan Novak"))]),
        ("Amelia Wright", [(q_issue, [q_issue.choices[3]]), (q_email, email_for("Amelia Wright"))]),
    ]
    for i, (name, items) in enumerate(responses):
        _add_response(db, form, _now_minus(days=9 - i, hours=1), items, duration_minutes=2)
    return form


def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Creator).count() > 0:
            return
        creator = Creator(name="Aadarsh Mohan Sinha", email="asinha_be23@thapar.edu")
        db.add(creator)
        db.flush()

        _seed_feedback_form(db, creator)
        _seed_ph_form(db, creator)
        _seed_rsvp_form(db, creator)
        _seed_support_form(db, creator)

        db.commit()
        print("Seeded database: demo creator, 4 forms and sample responses.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
