export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type FormStatus = "draft" | "published";

export interface Choice {
  id: number;
  label: string;
  position: number;
}

export interface LogicRule {
  choice_id: number;
  target_question_id: number;
}

export interface QuestionConfig {
  placeholder?: string;
  max_rating?: number;
  min?: number;
  max?: number;
  multiple_selection?: boolean;
  max_length?: number;
  logic?: LogicRule[];
  always_jump?: number | null;
  [key: string]: unknown;
}

export interface Question {
  id: number;
  qtype: QuestionType;
  title: string;
  description: string;
  required: boolean;
  position: number;
  config: QuestionConfig;
  choices: Choice[];
}

export type ThemeFont = "grotesk" | "mono" | "serif";

export interface Theme {
  background?: string;
  text?: string;
  button?: string;
  button_text?: string;
  font?: ThemeFont;
}

export interface FormSummary {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  welcome_title: string;
  welcome_description: string;
  welcome_button_text: string;
  thank_you_title: string;
  thank_you_description: string;
  theme: Theme;
  question_count: number;
  response_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormDetail extends FormSummary {
  questions: Question[];
}

export interface PublicForm {
  slug: string;
  title: string;
  welcome_title: string;
  welcome_description: string;
  welcome_button_text: string;
  thank_you_title: string;
  thank_you_description: string;
  theme: Theme;
  questions: Question[];
}

export interface AnswerValue {
  question_id: number;
  value: string | null;
  choice_ids: number[];
}

export interface ResponseRow {
  id: number;
  is_complete: boolean;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerValue[];
}

export interface ChoiceStat {
  choice_id: number;
  label: string;
  count: number;
}

export interface QuestionStat {
  question_id: number;
  qtype: QuestionType;
  title: string;
  required: boolean;
  answered: number;
  skipped: number;
  choices?: ChoiceStat[];
  yes_no?: { yes: number; no: number };
  rating?: { average: number; distribution: Record<string, number> };
  number?: { average: number; min: number; max: number };
  text?: { count: number; latest: string[] };
}

export interface FormStats {
  form_id: number;
  total_responses: number;
  started: number;
  completion_rate: number;
  average_seconds: number | null;
  questions: QuestionStat[];
}
