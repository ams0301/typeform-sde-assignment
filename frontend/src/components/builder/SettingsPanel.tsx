"use client";

import { Star, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import type { Choice, FormDetail, Question, QuestionConfig, Theme } from "@/lib/types";
import type { Selection } from "./ContentPanel";
import { typeMeta } from "@/lib/questionTypes";
import { cn, truncate } from "@/lib/utils";

interface SettingsPanelProps {
  form: FormDetail;
  selected: Selection;
  onEditForm: (patch: Record<string, unknown>) => void;
  onEditQuestion: (questionId: number, patch: Record<string, unknown>) => void;
  onDeleteQuestion: (questionId: number) => void;
}

const SWATCHES = [
  "#FFFFFF",
  "#F5F1E8",
  "#EAF3EE",
  "#E3ECF7",
  "#F0E7F5",
  "#F7E9E4",
  "#17233F",
  "#1A1A1A",
];

const FONTS: { key: NonNullable<Theme["font"]>; label: string; className: string }[] = [
  { key: "grotesk", label: "Grotesk", className: "font-display" },
  { key: "mono", label: "Mono", className: "font-mono" },
  { key: "serif", label: "Serif", className: "font-serif" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-b border-line px-5 py-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function RowToggle({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] font-medium text-ink">{label}</div>
        {hint && <div className="text-[11px] text-ink3">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-inputline px-3 py-2 text-sm text-ink focus:border-ink";

const selectClass = cn(inputClass, "bg-white");

function DesignSection({ form, onEditForm }: { form: FormDetail; onEditForm: (patch: Record<string, unknown>) => void }) {
  const theme = form.theme ?? {};

  const editTheme = (patch: Partial<Theme>) =>
    onEditForm({ theme: { ...theme, ...patch } });

  return (
    <Section title="Design">
      <Field label="Background color">
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Background ${color}`}
              onClick={() => editTheme({ background: color })}
              style={{ background: color }}
              className={cn(
                "h-8 w-8 rounded-lg border border-line transition-transform hover:scale-105",
                theme.background === color && "ring-2 ring-ink ring-offset-2",
              )}
            />
          ))}
          <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-lg border border-inputline">
            <input
              type="color"
              value={theme.background ?? "#FFFFFF"}
              onChange={(event) => editTheme({ background: event.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-ink2">
              +
            </span>
          </label>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Text color">
          <input
            type="color"
            value={theme.text ?? "#1A1A1A"}
            onChange={(event) => editTheme({ text: event.target.value })}
            className="h-9 w-full cursor-pointer rounded-lg border border-inputline bg-white p-1"
          />
        </Field>
        <Field label="Button color">
          <input
            type="color"
            value={theme.button ?? "#111111"}
            onChange={(event) => editTheme({ button: event.target.value, button_text: undefined })}
            className="h-9 w-full cursor-pointer rounded-lg border border-inputline bg-white p-1"
          />
        </Field>
      </div>
      <Field label="Font">
        <div className="flex overflow-hidden rounded-lg border border-inputline">
          {FONTS.map((font) => (
            <button
              key={font.key}
              type="button"
              onClick={() => editTheme({ font: font.key })}
              className={cn(
                "flex-1 py-2 text-[13px] transition-colors",
                font.className,
                theme.font === font.key || (!theme.font && font.key === "grotesk")
                  ? "bg-ink text-white"
                  : "text-ink2 hover:bg-black/5",
              )}
            >
              {font.label}
            </button>
          ))}
        </div>
      </Field>
    </Section>
  );
}

function QuestionSettings({
  form,
  question,
  onEditQuestion,
  onDeleteQuestion,
}: {
  form: FormDetail;
  question: Question;
  onEditQuestion: (questionId: number, patch: Record<string, unknown>) => void;
  onDeleteQuestion: (questionId: number) => void;
}) {
  const config = question.config ?? {};
  const editConfig = (patch: QuestionConfig) =>
    onEditQuestion(question.id, { config: { ...config, ...patch } });

  const others = form.questions.filter((candidate) => candidate.id !== question.id);
  const targetOptions = others.map((candidate) => (
    <option key={candidate.id} value={candidate.id}>
      Q{candidate.position + 1} · {truncate(candidate.title || "Untitled question", 26)}
    </option>
  ));

  const logic = config.logic ?? [];
  const isChoiceType = question.qtype === "multiple_choice" || question.qtype === "dropdown";
  const showChoiceLogic =
    isChoiceType && (question.qtype === "dropdown" || !config.multiple_selection);
  const showAlwaysJump = !isChoiceType;

  const setChoiceRule = (choiceId: number, target: number) => {
    const next = logic.filter((rule) => rule.choice_id !== choiceId);
    if (target) next.push({ choice_id: choiceId, target_question_id: target });
    editConfig({ logic: next });
  };

  return (
    <>
      <Section title="Question settings">
        <RowToggle
          label="Required"
          hint="People can’t skip this question"
        >
          <Toggle
            checked={question.required}
            onChange={(required) => onEditQuestion(question.id, { required })}
          />
        </RowToggle>

        {(question.qtype === "short_text" ||
          question.qtype === "long_text" ||
          question.qtype === "email" ||
          question.qtype === "number") && (
          <Field label="Placeholder text">
            <input
              value={config.placeholder ?? ""}
              onChange={(event) => editConfig({ placeholder: event.target.value })}
              placeholder="Type your answer here…"
              className={inputClass}
            />
          </Field>
        )}

        {question.qtype === "short_text" && (
          <Field label="Character limit (0 = unlimited)">
            <input
              type="number"
              min={0}
              value={config.max_length ?? 0}
              onChange={(event) => editConfig({ max_length: Number(event.target.value) || 0 })}
              className={inputClass}
            />
          </Field>
        )}

        {question.qtype === "number" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min">
              <input
                type="number"
                value={config.min ?? ""}
                onChange={(event) => {
                  const value = event.target.value === "" ? undefined : Number(event.target.value);
                  const next = { ...config };
                  if (value === undefined) delete next.min;
                  else next.min = value;
                  onEditQuestion(question.id, { config: next });
                }}
                placeholder="Any"
                className={inputClass}
              />
            </Field>
            <Field label="Max">
              <input
                type="number"
                value={config.max ?? ""}
                onChange={(event) => {
                  const value = event.target.value === "" ? undefined : Number(event.target.value);
                  const next = { ...config };
                  if (value === undefined) delete next.max;
                  else next.max = value;
                  onEditQuestion(question.id, { config: next });
                }}
                placeholder="Any"
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {question.qtype === "multiple_choice" && (
          <RowToggle
            label="Multiple selection"
            hint="Let people pick more than one choice"
          >
            <Toggle
              checked={Boolean(config.multiple_selection)}
              onChange={(multiple_selection) => editConfig({ multiple_selection })}
            />
          </RowToggle>
        )}

        {question.qtype === "rating" && (
          <Field label="Maximum rating">
            <div className="flex overflow-hidden rounded-lg border border-inputline">
              {[5, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => editConfig({ max_rating: value })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-[13px] transition-colors",
                    (config.max_rating ?? 5) === value
                      ? "bg-ink text-white"
                      : "text-ink2 hover:bg-black/5",
                  )}
                >
                  {Array.from({ length: Math.min(value, 5) }).map((_, index) => (
                    <Star key={index} className="h-3 w-3" />
                  ))}
                  {value}
                </button>
              ))}
            </div>
          </Field>
        )}
      </Section>

      {(showChoiceLogic || showAlwaysJump) && (
        <Section title="Logic">
          <p className="text-xs leading-relaxed text-ink3">
            Send people to a different question based on their answer.
          </p>
          {showChoiceLogic &&
            question.choices.map((choice: Choice) =>
              choice.id < 0 ? (
                <div key={choice.id} className="text-xs text-ink3">
                  Save the form to add logic to “{truncate(choice.label || "new choice", 20)}”.
                </div>
              ) : (
                <Field key={choice.id} label={`“${truncate(choice.label || "Choice", 22)}” goes to`}>
                  <select
                    value={logic.find((rule) => rule.choice_id === choice.id)?.target_question_id ?? 0}
                    onChange={(event) => setChoiceRule(choice.id, Number(event.target.value))}
                    className={selectClass}
                  >
                    <option value={0}>Next question</option>
                    {targetOptions}
                  </select>
                </Field>
              ),
            )}
          {showAlwaysJump && (
            <Field label="After this question, go to">
              <select
                value={config.always_jump ?? 0}
                onChange={(event) => {
                  const target = Number(event.target.value);
                  const next = { ...config };
                  if (!target) next.always_jump = null;
                  else next.always_jump = target;
                  onEditQuestion(question.id, { config: next });
                }}
                className={selectClass}
              >
                <option value={0}>Next question</option>
                {targetOptions}
              </select>
            </Field>
          )}
          {question.qtype === "multiple_choice" && config.multiple_selection && (
            <p className="text-xs text-ink3">Logic isn’t available with multiple selection.</p>
          )}
        </Section>
      )}

      <div className="px-5 py-5">
        <button
          type="button"
          onClick={() => onDeleteQuestion(question.id)}
          className="flex items-center gap-2 text-[13px] font-medium text-danger transition-colors hover:text-danger/80"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete question
        </button>
      </div>
    </>
  );
}

export function SettingsPanel({
  form,
  selected,
  onEditForm,
  onEditQuestion,
  onDeleteQuestion,
}: SettingsPanelProps) {
  const questionIndex =
    typeof selected === "number" ? form.questions.findIndex((item) => item.id === selected) : -1;
  const question = questionIndex >= 0 ? form.questions[questionIndex] : null;

  return (
    <aside className="w-[330px] shrink-0 overflow-y-auto border-l border-line bg-white">
      {question ? (
        <>
          <div className="border-b border-line px-5 py-4">
            <div className="text-sm font-semibold text-ink">
              Question {questionIndex + 1} of {form.questions.length}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-ink3">
              <span
                className="flex h-4 w-4 items-center justify-center rounded"
                style={{
                  background: typeMeta(question.qtype).tint,
                  color: typeMeta(question.qtype).color,
                }}
              >
                <Star className="h-2.5 w-2.5" />
              </span>
              {typeMeta(question.qtype).label}
            </div>
          </div>
          <QuestionSettings
            form={form}
            question={question}
            onEditQuestion={onEditQuestion}
            onDeleteQuestion={onDeleteQuestion}
          />
        </>
      ) : selected === "welcome" ? (
        <>
          <div className="border-b border-line px-5 py-4 text-sm font-semibold text-ink">
            Welcome screen
          </div>
          <Section title="Content">
            <Field label="Headline">
              <input
                value={form.welcome_title}
                onChange={(event) => onEditForm({ welcome_title: event.target.value })}
                placeholder="Hey there 👋"
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.welcome_description}
                onChange={(event) => onEditForm({ welcome_description: event.target.value })}
                placeholder="Welcome text…"
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
            <Field label="Button text">
              <input
                value={form.welcome_button_text}
                onChange={(event) => onEditForm({ welcome_button_text: event.target.value })}
                placeholder="Start"
                className={inputClass}
              />
            </Field>
          </Section>
          <DesignSection form={form} onEditForm={onEditForm} />
        </>
      ) : (
        <>
          <div className="border-b border-line px-5 py-4 text-sm font-semibold text-ink">
            Thank you screen
          </div>
          <Section title="Content">
            <Field label="Title">
              <input
                value={form.thank_you_title}
                onChange={(event) => onEditForm({ thank_you_title: event.target.value })}
                placeholder="Thanks for completing this typeform"
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.thank_you_description}
                onChange={(event) => onEditForm({ thank_you_description: event.target.value })}
                placeholder="Have a great day!"
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
            <p className="text-xs leading-relaxed text-ink3">
              Use <code className="rounded bg-black/6 px-1 py-0.5 text-[11px]">{"{{name}}"}</code> in
              the title to greet people by name.
            </p>
          </Section>
          <DesignSection form={form} onEditForm={onEditForm} />
        </>
      )}
    </aside>
  );
}
