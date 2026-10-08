import type { Question } from "@/lib/types";

export interface AnswerDraft {
  value?: string;
  choice_ids?: number[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the backend validation with the same respondent-friendly messages. */
export function validateAnswerClient(question: Question, draft: AnswerDraft): string | null {
  const config = question.config ?? {};
  const value = (draft.value ?? "").trim();
  const choiceIds = draft.choice_ids ?? [];

  if (question.qtype === "multiple_choice" || question.qtype === "dropdown") {
    if (question.required && choiceIds.length === 0) return "This is required.";
    return null;
  }

  if (question.qtype === "yes_no") {
    if (question.required && !value) return "This is required.";
    return null;
  }

  if (question.required && !value) return "This is required.";
  if (!value) return null;

  if (question.qtype === "email" && !EMAIL_RE.test(value)) {
    return "Hmm… that doesn’t look like a valid email.";
  }

  if (question.qtype === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) return "Please enter a number.";
    if (config.min != null && num < config.min) {
      return `Please enter a number of ${config.min} or more.`;
    }
    if (config.max != null && num > config.max) {
      return `Please enter a number no higher than ${config.max}.`;
    }
  }

  if (question.qtype === "rating") {
    const rating = Number(value);
    const max = config.max_rating ?? 5;
    if (!Number.isInteger(rating) || rating < 1 || rating > max) {
      return `Please pick a rating between 1 and ${max}.`;
    }
  }

  if (question.qtype === "short_text") {
    const limit = config.max_length ?? 0;
    if (limit && value.length > limit) {
      return `Please keep it under ${limit} characters.`;
    }
  }

  return null;
}
