import re

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-']+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def validate_answer(question, payload):
    """Validate one answer against its question definition.

    Returns (value, choice_ids) in their normalized stored form.
    Raises ValueError with a respondent-friendly message.
    """
    config = question.config or {}
    value = (payload.value or "").strip() or None
    choice_ids = list(payload.choice_ids or [])
    valid_choice_ids = {choice.id for choice in question.choices}

    if question.qtype in ("multiple_choice", "dropdown"):
        unknown = [cid for cid in choice_ids if cid not in valid_choice_ids]
        if unknown:
            raise ValueError("That option isn’t available.")
        if question.required and not choice_ids:
            raise ValueError("This is required.")
        if question.qtype == "dropdown" and len(choice_ids) > 1:
            raise ValueError("Please choose only one option.")
        if question.qtype == "multiple_choice" and not config.get("multiple_selection") and len(choice_ids) > 1:
            raise ValueError("Please choose only one option.")
        return None, choice_ids

    if question.required and value is None:
        raise ValueError("This is required.")
    if value is None:
        return None, []

    if question.qtype == "email":
        if not EMAIL_RE.match(value):
            raise ValueError("Hmm… that doesn’t look like a valid email.")
    elif question.qtype == "number":
        try:
            num = float(value.replace(",", "."))
        except ValueError:
            raise ValueError("Please enter a number.")
        config_min = config.get("min")
        config_max = config.get("max")
        if config_min is not None and num < float(config_min):
            raise ValueError(f"Please enter a number of {config_min} or more.")
        if config_max is not None and num > float(config_max):
            raise ValueError(f"Please enter a number no higher than {config_max}.")
        value = str(int(num)) if num.is_integer() else str(num)
    elif question.qtype == "rating":
        try:
            rating = int(value)
        except ValueError:
            raise ValueError("Please pick a rating.")
        max_rating = int(config.get("max_rating") or 5)
        if not 1 <= rating <= max_rating:
            raise ValueError(f"Please pick a rating between 1 and {max_rating}.")
        value = str(rating)
    elif question.qtype == "yes_no":
        lowered = value.lower()
        if lowered not in ("yes", "no"):
            raise ValueError("Please choose Yes or No.")
        value = lowered
    elif question.qtype == "short_text":
        max_length = int(config.get("max_length") or 0)
        if max_length and len(value) > max_length:
            raise ValueError(f"Please keep it under {max_length} characters.")

    return value, []
