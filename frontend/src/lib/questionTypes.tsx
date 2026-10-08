import {
  AtSign,
  ChevronDownSquare,
  Hash,
  ListChecks,
  MessageSquareText,
  Star,
  ToggleLeft,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { QuestionType } from "./types";

export interface QuestionTypeMeta {
  key: QuestionType;
  label: string;
  icon: LucideIcon;
  tint: string;
  color: string;
}

export const QUESTION_TYPE_META: QuestionTypeMeta[] = [
  { key: "short_text", label: "Short text", icon: Type, tint: "#E1E8FE", color: "#3553D9" },
  { key: "long_text", label: "Long text", icon: MessageSquareText, tint: "#EBE0FF", color: "#7C3AED" },
  { key: "multiple_choice", label: "Multiple choice", icon: ListChecks, tint: "#D9F2E3", color: "#1F8A4C" },
  { key: "dropdown", label: "Dropdown", icon: ChevronDownSquare, tint: "#FFE7D6", color: "#C2601A" },
  { key: "email", label: "Email", icon: AtSign, tint: "#FFD9EC", color: "#C02672" },
  { key: "number", label: "Number", icon: Hash, tint: "#FFF3D6", color: "#B45309" },
  { key: "yes_no", label: "Yes/No", icon: ToggleLeft, tint: "#D6F3F5", color: "#0E7490" },
  { key: "rating", label: "Rating", icon: Star, tint: "#FFF0C2", color: "#B5760A" },
];

const META_BY_TYPE: Record<QuestionType, QuestionTypeMeta> = Object.fromEntries(
  QUESTION_TYPE_META.map((meta) => [meta.key, meta]),
) as Record<QuestionType, QuestionTypeMeta>;

export const typeMeta = (qtype: QuestionType): QuestionTypeMeta => META_BY_TYPE[qtype];

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
