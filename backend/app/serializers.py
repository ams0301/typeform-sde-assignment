def iso(dt):
    return dt.isoformat() if dt is not None else None


def question_to_dict(question):
    return {
        "id": question.id,
        "qtype": question.qtype,
        "title": question.title,
        "description": question.description,
        "required": question.required,
        "position": question.position,
        "config": question.config or {},
        "choices": [
            {"id": choice.id, "label": choice.label, "position": choice.position}
            for choice in question.choices
        ],
    }


def form_summary_to_dict(form, response_count=0):
    return {
        "id": form.id,
        "title": form.title,
        "slug": form.slug,
        "status": form.status,
        "welcome_title": form.welcome_title,
        "welcome_description": form.welcome_description,
        "welcome_button_text": form.welcome_button_text,
        "thank_you_title": form.thank_you_title,
        "thank_you_description": form.thank_you_description,
        "theme": form.theme or {},
        "question_count": len(form.questions),
        "response_count": response_count,
        "published_at": iso(form.published_at),
        "created_at": iso(form.created_at),
        "updated_at": iso(form.updated_at),
    }


def form_detail_to_dict(form, response_count=0):
    data = form_summary_to_dict(form, response_count)
    data["questions"] = [question_to_dict(q) for q in form.questions]
    return data


def public_form_to_dict(form):
    """Shape sent to the public respondent flow: no creator metadata."""
    return {
        "slug": form.slug,
        "title": form.title,
        "welcome_title": form.welcome_title,
        "welcome_description": form.welcome_description,
        "welcome_button_text": form.welcome_button_text,
        "thank_you_title": form.thank_you_title,
        "thank_you_description": form.thank_you_description,
        "theme": form.theme or {},
        "questions": [question_to_dict(q) for q in form.questions],
    }


def answer_to_dict(answer):
    return {
        "question_id": answer.question_id,
        "value": answer.value,
        "choice_ids": [selection.choice_id for selection in answer.selections],
    }


def response_to_dict(response):
    return {
        "id": response.id,
        "is_complete": response.is_complete,
        "started_at": iso(response.started_at),
        "submitted_at": iso(response.submitted_at),
        "answers": [answer_to_dict(a) for a in response.answers],
    }
