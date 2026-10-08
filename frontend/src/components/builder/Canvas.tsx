"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Circle,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Choice, FormDetail, Question } from "@/lib/types";
import type { Selection } from "./ContentPanel";
import { cn } from "@/lib/utils";

interface CanvasProps {
  form: FormDetail;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onEditForm: (patch: Record<string, unknown>) => void;
  onEditQuestion: (questionId: number, patch: Record<string, unknown>) => void;
  onDeleteQuestion: (questionId: number) => void;
  onDuplicateQuestion: (question: Question) => void;
  registerRef: (key: string, element: HTMLElement | null) => void;
}

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      {...props}
      className={cn("resize-none overflow-hidden", props.className)}
    />
  );
}

function BlockShell({
  blockKey,
  selected,
  onSelect,
  registerRef,
  index,
  toolbar,
  children,
}: {
  blockKey: string;
  selected: boolean;
  onSelect: () => void;
  registerRef: (key: string, element: HTMLElement | null) => void;
  index?: number;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      ref={(element) => registerRef(blockKey, element)}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer rounded-2xl border-2 bg-white px-7 py-9 transition-all",
        selected
          ? "border-ink shadow-[0_10px_32px_rgba(0,0,0,0.09)]"
          : "border-transparent hover:border-inputline",
      )}
    >
      {index !== undefined && (
        <span className="absolute left-4 top-3.5 text-[11px] font-semibold text-ink3">
          {index + 1}
        </span>
      )}
      {toolbar && (
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "absolute -top-3.5 right-4 flex items-center gap-1 rounded-xl border border-line bg-white px-1.5 py-1 shadow-md transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {toolbar}
        </div>
      )}
      {children}
    </section>
  );
}

function ChoiceEditor({
  question,
  onChange,
  variant,
}: {
  question: Question;
  onChange: (choices: Choice[]) => void;
  variant: "multiple_choice" | "dropdown";
}) {
  const multiple = question.config.multiple_selection && variant === "multiple_choice";

  const update = (id: number, label: string) =>
    onChange(question.choices.map((choice) => (choice.id === id ? { ...choice, label } : choice)));

  const remove = (id: number) =>
    onChange(question.choices.filter((choice) => choice.id !== id));

  const add = () =>
    onChange([
      ...question.choices,
      { id: -Date.now(), label: "", position: question.choices.length },
    ]);

  return (
    <div className="max-w-xl space-y-1.5">
      {question.choices.map((choice, index) => (
        <div
          key={choice.id}
          className="flex items-center gap-3 rounded-lg border-2 border-transparent px-4 py-3 transition-colors hover:border-inputline focus-within:border-ink"
        >
          {variant === "dropdown" ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-ink3" />
          ) : multiple ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] border-ink3" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-ink3" />
          )}
          <input
            value={choice.label}
            onChange={(event) => update(choice.id, event.target.value)}
            placeholder={`Option ${index + 1}`}
            className="min-w-0 flex-1 bg-transparent font-display text-lg text-ink placeholder:text-ink3/70"
          />
          {question.choices.length > 1 && (
            <button
              type="button"
              aria-label="Delete choice"
              onClick={() => remove(choice.id)}
              className="rounded-md p-1 text-ink3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium text-ink2 transition-colors hover:text-ink"
      >
        <Plus className="h-4 w-4" />
        {variant === "dropdown" ? "Add option" : "Add choice"}
      </button>
    </div>
  );
}

function QuestionPreview({ question }: { question: Question }) {
  const underline =
    "w-full max-w-xl border-b-2 border-inputline bg-transparent pb-2.5 font-display text-xl text-ink placeholder:text-ink3/70 transition-colors hover:border-ink/60";

  switch (question.qtype) {
    case "short_text":
    case "email":
    case "number":
      return (
        <input
          key={question.id}
          placeholder={question.config.placeholder ?? "Type your answer here…"}
          className={underline}
        />
      );
    case "long_text":
      return (
        <AutoTextarea
          key={question.id}
          placeholder={question.config.placeholder ?? "Type your answer here…"}
          className={cn(underline, "min-h-10")}
        />
      );
    case "yes_no":
      return (
        <div className="flex max-w-md gap-3">
          {["Yes", "No"].map((label, index) => (
            <span
              key={label}
              className="flex items-center gap-3 rounded-lg border-2 border-inputline px-5 py-3.5 font-display text-lg"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border-[1.5px] border-ink3 text-xs font-semibold text-ink2">
                {index === 0 ? "Y" : "N"}
              </span>
              {label}
            </span>
          ))}
        </div>
      );
    case "rating": {
      const max = question.config.max_rating ?? 5;
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: max }).map((_, index) => (
            <Star key={index} className="h-9 w-9 text-ink3" strokeWidth={1.5} />
          ))}
          <span className="ml-2 text-sm text-ink3">1–{max}</span>
        </div>
      );
    }
    default:
      return null;
  }
}

export function Canvas({
  form,
  selected,
  onSelect,
  onEditForm,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  registerRef,
}: CanvasProps) {
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-6 px-4 py-10">
      <BlockShell
        blockKey="welcome"
        selected={selected === "welcome"}
        onSelect={() => onSelect("welcome")}
        registerRef={registerRef}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink3">
          Welcome screen
          <span className="font-normal normal-case tracking-normal opacity-80">
            — leave blank to skip it
          </span>
        </div>
        <AutoTextarea
          value={form.welcome_title}
          onChange={(event) => onEditForm({ welcome_title: event.target.value })}
          placeholder="Welcome headline (optional)"
          className="w-full bg-transparent font-display text-3xl font-semibold text-ink placeholder:text-ink3/60"
        />
        <AutoTextarea
          value={form.welcome_description}
          onChange={(event) => onEditForm({ welcome_description: event.target.value })}
          placeholder="Add a short description… (optional)"
          className="mt-2 w-full bg-transparent text-base text-ink2 placeholder:text-ink3/60"
        />
        {(form.welcome_title || form.welcome_description) && (
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-white">
            {form.welcome_button_text || "Start"}
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </BlockShell>

      {form.questions.map((question, index) => (
        <BlockShell
          key={question.id}
          blockKey={String(question.id)}
          selected={selected === question.id}
          onSelect={() => onSelect(question.id)}
          registerRef={registerRef}
          index={index}
          toolbar={
            <>
              <button
                type="button"
                aria-label="Duplicate question"
                onClick={() => onDuplicateQuestion(question)}
                className="rounded-lg p-1.5 text-ink2 transition-colors hover:bg-black/5 hover:text-ink"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Delete question"
                onClick={() => onDeleteQuestion(question.id)}
                className="rounded-lg p-1.5 text-ink2 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          }
        >
          <AutoTextarea
            value={question.title}
            onChange={(event) => onEditQuestion(question.id, { title: event.target.value })}
            placeholder="Your question goes here…"
            className="w-full bg-transparent font-display text-2xl font-semibold text-ink placeholder:text-ink3/60"
          />
          <AutoTextarea
            value={question.description}
            onChange={(event) => onEditQuestion(question.id, { description: event.target.value })}
            placeholder="Description (optional)"
            className="mt-1.5 w-full bg-transparent text-[15px] text-ink2 placeholder:text-ink3/60"
          />
          <div className="mt-6">
            {question.qtype === "multiple_choice" || question.qtype === "dropdown" ? (
              <ChoiceEditor
                question={question}
                variant={question.qtype}
                onChange={(choices) => onEditQuestion(question.id, { choices })}
              />
            ) : (
              <QuestionPreview question={question} />
            )}
          </div>
          {question.required && (
            <span className="absolute bottom-4 right-5 flex items-center gap-1 text-[11px] font-medium text-ink3">
              <Check className="h-3 w-3" />
              Required
            </span>
          )}
        </BlockShell>
      ))}

      <BlockShell
        blockKey="thankyou"
        selected={selected === "thankyou"}
        onSelect={() => onSelect("thankyou")}
        registerRef={registerRef}
      >
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink3">
          Thank you screen
        </div>
        <AutoTextarea
          value={form.thank_you_title}
          onChange={(event) => onEditForm({ thank_you_title: event.target.value })}
          placeholder="Thanks for completing this typeform"
          className="w-full bg-transparent font-display text-3xl font-semibold text-ink placeholder:text-ink3/60"
        />
        <AutoTextarea
          value={form.thank_you_description}
          onChange={(event) => onEditForm({ thank_you_description: event.target.value })}
          placeholder="Add a closing message… (optional)"
          className="mt-2 w-full bg-transparent text-base text-ink2 placeholder:text-ink3/60"
        />
        <p className="mt-5 text-xs text-ink3">
          Tip: use <code className="rounded bg-black/6 px-1 py-0.5 text-[11px]">{"{{name}}"}</code>{" "}
          in the title to greet people by name — it fills in their first short-text answer.
        </p>
      </BlockShell>
    </div>
  );
}
