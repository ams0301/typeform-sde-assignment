from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Creator(Base):
    """A form creator. The assignment simplifies auth: one default creator is assumed."""

    __tablename__ = "creators"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    email = Column(String(320), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    forms = relationship("Form", back_populates="creator", cascade="all, delete-orphan", order_by="Form.id")


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True)
    creator_id = Column(Integer, ForeignKey("creators.id"), nullable=False)
    title = Column(String(500), nullable=False, default="Untitled form")
    slug = Column(String(32), nullable=False, unique=True, index=True)
    status = Column(String(16), nullable=False, default="draft")  # draft | published
    welcome_title = Column(String(500), nullable=False, default="")
    welcome_description = Column(Text, nullable=False, default="")
    welcome_button_text = Column(String(100), nullable=False, default="Start")
    thank_you_title = Column(String(500), nullable=False, default="Thanks for completing this typeform")
    thank_you_description = Column(Text, nullable=False, default="Have a great day!")
    theme = Column(JSON, nullable=False, default=dict)
    settings = Column(JSON, nullable=False, default=dict)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    creator = relationship("Creator", back_populates="forms")
    questions = relationship(
        "Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.position"
    )
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    qtype = Column(String(32), nullable=False)
    title = Column(String(1000), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    required = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=0)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    form = relationship("Form", back_populates="questions")
    choices = relationship("Choice", back_populates="question", cascade="all, delete-orphan", order_by="Choice.position")
    answers = relationship("Answer", back_populates="question", cascade="all, delete")


class Choice(Base):
    __tablename__ = "choices"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    label = Column(String(1000), nullable=False)
    position = Column(Integer, nullable=False, default=0)

    question = relationship("Question", back_populates="choices")
    selections = relationship("AnswerSelection", back_populates="choice", cascade="all, delete")


class Response(Base):
    """One respondent session. is_complete=False rows track partial responses."""

    __tablename__ = "responses"

    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    is_complete = Column(Boolean, nullable=False, default=False)
    started_at = Column(DateTime, nullable=False, default=utcnow)
    submitted_at = Column(DateTime, nullable=True)
    meta = Column(JSON, nullable=False, default=dict)

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """Answer to a single question. Either a typed value or choice selections (or both)."""

    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),)

    id = Column(Integer, primary_key=True)
    response_id = Column(Integer, ForeignKey("responses.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    value = Column(Text, nullable=True)

    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    selections = relationship("AnswerSelection", back_populates="answer", cascade="all, delete-orphan")


class AnswerSelection(Base):
    """Join table: which choices of a choice question were selected for a given answer."""

    __tablename__ = "answer_selections"
    __table_args__ = (UniqueConstraint("answer_id", "choice_id", name="uq_selection_pair"),)

    id = Column(Integer, primary_key=True)
    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=False)
    choice_id = Column(Integer, ForeignKey("choices.id"), nullable=False)

    answer = relationship("Answer", back_populates="selections")
    choice = relationship("Choice", back_populates="selections")
