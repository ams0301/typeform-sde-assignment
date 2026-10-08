import type {
  AnswerValue,
  FormDetail,
  FormStats,
  FormSummary,
  PublicForm,
  Question,
  QuestionType,
  QuestionConfig,
  ResponseRow,
  Theme,
} from "./types";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API error (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      detail = null;
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface QuestionPayload {
  qtype: QuestionType;
  title: string;
  description?: string;
  required?: boolean;
  choices?: string[];
  config?: QuestionConfig;
}

export interface QuestionPatch {
  title?: string;
  description?: string;
  required?: boolean;
  choices?: string[];
  config?: QuestionConfig;
}

export interface FormPatch {
  title?: string;
  welcome_title?: string;
  welcome_description?: string;
  welcome_button_text?: string;
  thank_you_title?: string;
  thank_you_description?: string;
  theme?: Theme;
  settings?: Record<string, unknown>;
}

export const api = {
  listForms: () => req<FormSummary[]>("/api/forms"),

  createForm: (title = "Untitled form") =>
    req<FormDetail>("/api/forms", { method: "POST", body: JSON.stringify({ title }) }),

  getForm: (id: number) => req<FormDetail>(`/api/forms/${id}`),

  patchForm: (id: number, patch: FormPatch) =>
    req<FormDetail>(`/api/forms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteForm: (id: number) => req<void>(`/api/forms/${id}`, { method: "DELETE" }),

  duplicateForm: (id: number) =>
    req<FormDetail>(`/api/forms/${id}/duplicate`, { method: "POST" }),

  publishForm: (id: number) => req<FormDetail>(`/api/forms/${id}/publish`, { method: "POST" }),

  unpublishForm: (id: number) => req<FormDetail>(`/api/forms/${id}/unpublish`, { method: "POST" }),

  addQuestion: (formId: number, payload: QuestionPayload) =>
    req<Question>(`/api/forms/${formId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateQuestion: (questionId: number, patch: QuestionPatch) =>
    req<Question>(`/api/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteQuestion: (questionId: number) => req<void>(`/api/questions/${questionId}`, { method: "DELETE" }),

  reorderQuestions: (formId: number, questionIds: number[]) =>
    req<Question[]>(`/api/forms/${formId}/questions/order`, {
      method: "PUT",
      body: JSON.stringify({ question_ids: questionIds }),
    }),

  listResponses: (formId: number) => req<ResponseRow[]>(`/api/forms/${formId}/responses`),

  getResponse: (formId: number, responseId: number) =>
    req<ResponseRow>(`/api/forms/${formId}/responses/${responseId}`),

  deleteResponse: (formId: number, responseId: number) =>
    req<void>(`/api/forms/${formId}/responses/${responseId}`, { method: "DELETE" }),

  getStats: (formId: number) => req<FormStats>(`/api/forms/${formId}/stats`),

  getPublicForm: (slug: string) => req<PublicForm>(`/api/public/forms/${slug}`),

  startResponse: (slug: string) =>
    req<{ response_id: number }>(`/api/public/forms/${slug}/start`, { method: "POST" }),

  submitResponse: (
    slug: string,
    payload: { response_id?: number | null; answers: AnswerValue[]; path: number[] },
  ) =>
    req<{ ok: boolean; response_id: number }>(`/api/public/forms/${slug}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
