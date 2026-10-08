from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

QuestionTypeLiteral = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]


class FormCreate(BaseModel):
    title: str = "Untitled form"


class FormUpdate(BaseModel):
    title: Optional[str] = None
    welcome_title: Optional[str] = None
    welcome_description: Optional[str] = None
    welcome_button_text: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_description: Optional[str] = None
    theme: Optional[dict[str, Any]] = None
    settings: Optional[dict[str, Any]] = None


class QuestionCreate(BaseModel):
    qtype: QuestionTypeLiteral
    title: str = ""
    description: str = ""
    required: bool = False
    choices: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    choices: Optional[list[str]] = None
    config: Optional[dict[str, Any]] = None


class QuestionOrderUpdate(BaseModel):
    question_ids: list[int]


class AnswerIn(BaseModel):
    question_id: int
    value: Optional[str] = None
    choice_ids: list[int] = Field(default_factory=list)


class ResponseSubmitIn(BaseModel):
    response_id: Optional[int] = None
    answers: list[AnswerIn]
    path: list[int] = Field(default_factory=list)
