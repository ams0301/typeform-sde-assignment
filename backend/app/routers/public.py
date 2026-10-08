from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas, validation
from ..database import get_db
from ..models import utcnow
from ..serializers import public_form_to_dict

router = APIRouter(prefix="/api", tags=["public"])


def get_published_form(db: Session, slug: str) -> models.Form:
    form = db.query(models.Form).filter(models.Form.slug == slug).first()
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found.")
    if form.status != "published":
        raise HTTPException(status_code=404, detail="This form isn’t accepting responses right now.")
    return form


@router.get("/public/forms/{slug}")
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """Public form definition for the respondent flow. No auth required."""
    form = get_published_form(db, slug)
    return public_form_to_dict(form)


@router.post("/public/forms/{slug}/start", status_code=201)
def start_response(slug: str, request: Request, db: Session = Depends(get_db)):
    """Record that someone started filling the form (partial-response tracking)."""
    form = get_published_form(db, slug)
    user_agent = (request.headers.get("user-agent") or "")[:300]
    response = models.Response(form_id=form.id, is_complete=False, meta={"user_agent": user_agent})
    db.add(response)
    db.commit()
    db.refresh(response)
    return {"response_id": response.id}


@router.post("/public/forms/{slug}/submit", status_code=201)
def submit_response(slug: str, payload: schemas.ResponseSubmitIn, db: Session = Depends(get_db)):
    """Validate and store a completed response.

    `path` lists the question ids the respondent actually saw. Required
    questions outside the path (skipped via logic jumps) are not enforced.
    An empty path means "every question was shown".
    """
    form = get_published_form(db, slug)
    questions = {q.id: q for q in form.questions}

    validated = {}
    errors = []
    for answer_in in payload.answers:
        question = questions.get(answer_in.question_id)
        if question is None:
            continue  # the question was deleted between load and submit
        try:
            value, choice_ids = validation.validate_answer(question, answer_in)
            validated[question.id] = (value, choice_ids)
        except ValueError as exc:
            errors.append({"question_id": question.id, "message": str(exc)})

    shown = set(payload.path) if payload.path else set(questions.keys())
    for question in form.questions:
        if question.required and question.id in shown and question.id not in validated:
            errors.append({"question_id": question.id, "message": "This is required."})

    if errors:
        raise HTTPException(status_code=422, detail={"answers": errors})

    response = None
    if payload.response_id:
        candidate = db.get(models.Response, payload.response_id)
        if candidate is not None and candidate.form_id == form.id and not candidate.is_complete:
            response = candidate
    if response is None:
        response = models.Response(form_id=form.id, is_complete=False)
        db.add(response)
        db.flush()

    for existing in list(response.answers):
        db.delete(existing)
    db.flush()

    for question_id, (value, choice_ids) in validated.items():
        answer = models.Answer(response_id=response.id, question_id=question_id, value=value)
        db.add(answer)
        db.flush()
        for choice_id in choice_ids:
            db.add(models.AnswerSelection(answer_id=answer.id, choice_id=choice_id))

    response.is_complete = True
    response.submitted_at = utcnow()
    db.commit()
    db.refresh(response)
    return {"ok": True, "response_id": response.id}
