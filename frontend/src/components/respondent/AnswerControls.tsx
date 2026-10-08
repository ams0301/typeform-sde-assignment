"use client";

import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { LETTERS } from "@/lib/questionTypes";
import { cn, withAlpha } from "@/lib/utils";
import type { AnswerDraft } from "./validation";

interface ControlProps {
  question: Question;
  draft: AnswerDraft;
  onChange: (patch: Partial<AnswerDraft>) => void;
  onAdvance: () => void;
  text: string;
}

function TextInputControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const [focused, setFocused] = useState(false);
  const config = question.config ?? {};
  const isNumber = question.qtype === "number";
  const isEmail = question.qtype === "email";

  return (
    <div>
      <input
        autoFocus
        type="text"
        inputMode={isNumber ? "decimal" : isEmail ? "email" : "text"}
        value={draft.value ?? ""}
        onChange={(event) => onChange({ value: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdvance();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={
          config.placeholder ||
          (isEmail ? "name@example.com" : isNumber ? "Type your answer here…" : "Type your answer here…")
        }
        className="w-full max-w-[560px] border-b-2 bg-transparent pb-3 font-display text-[22px] outline-none transition-colors placeholder:opacity-40"
        style={{ borderColor: focused ? text : withAlpha(text, 0.3) }}
      />
      {isNumber && config.min != null && config.max != null && (
        <p className="mt-3 text-sm opacity-60">
          Between {config.min} and {config.max}
        </p>
      )}
    </div>
  );
}

function LongTextControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const [focused, setFocused] = useState(true);
  const config = question.config ?? {};

  return (
    <div>
      <textarea
        autoFocus
        rows={3}
        value={draft.value ?? ""}
        onChange={(event) => onChange({ value: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onAdvance();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={config.placeholder || "Type your answer here…"}
        className="w-full max-w-[560px] resize-none border-b-2 bg-transparent pb-3 font-display text-[22px] outline-none transition-colors placeholder:opacity-40"
        style={{ borderColor: focused ? text : withAlpha(text, 0.3) }}
      />
      <p className="mt-3 text-sm opacity-50">
        Press <kbd className="rounded px-1 py-0.5" style={{ background: withAlpha(text, 0.12) }}>Ctrl</kbd>
        {" + "}
        <kbd className="rounded px-1 py-0.5" style={{ background: withAlpha(text, 0.12) }}>Enter</kbd> to continue
      </p>
    </div>
  );
}

function ChoiceControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const multiple = Boolean(question.config?.multiple_selection);
  const selected = draft.choice_ids ?? [];
  const [focusIdx, setFocusIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [question.id]);

  const toggle = (id: number) => {
    if (multiple) {
      onChange({
        choice_ids: selected.includes(id)
          ? selected.filter((item) => item !== id)
          : [...selected, id],
      });
    } else {
      onChange({ choice_ids: [id] });
    }
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={(event) => {
        const count = question.choices.length;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setFocusIdx((index) => (index + 1) % count);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setFocusIdx((index) => (index - 1 + count) % count);
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (focusIdx >= 0 && focusIdx < count) toggle(question.choices[focusIdx].id);
          else onAdvance();
        } else if (/^[a-zA-Z]$/.test(event.key) && !event.metaKey && !event.ctrlKey) {
          const index = event.key.toUpperCase().charCodeAt(0) - 65;
          if (index < count) {
            event.preventDefault();
            setFocusIdx(index);
            toggle(question.choices[index].id);
          }
        }
      }}
      className="max-w-[560px] space-y-2.5 outline-none"
    >
      {question.choices.map((choice, index) => {
        const isSelected = selected.includes(choice.id);
        const isFocused = focusIdx === index;
        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => {
              toggle(choice.id);
              setFocusIdx(index);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left font-display text-lg transition-all duration-150 md:text-xl",
            )}
            style={{
              borderColor: isSelected
                ? text
                : isFocused
                  ? withAlpha(text, 0.45)
                  : withAlpha(text, 0.14),
              background: isSelected
                ? withAlpha(text, 0.07)
                : isFocused
                  ? withAlpha(text, 0.04)
                  : "transparent",
            }}
          >
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] text-[11px] font-semibold"
              style={{
                borderColor: withAlpha(text, isSelected ? 0.9 : 0.35),
                background: isSelected ? withAlpha(text, 0.12) : "transparent",
              }}
            >
              {LETTERS[index]}
            </span>
            <span className="flex-1">{choice.label}</span>
            <span
              className={cn(
                "flex h-[22px] w-[22px] shrink-0 items-center justify-center border-[1.5px]",
                multiple ? "rounded-[4px]" : "rounded-full",
              )}
              style={{
                borderColor: isSelected ? text : withAlpha(text, 0.35),
                background: isSelected ? text : "transparent",
              }}
            >
              {isSelected && <Check className="h-3.5 w-3.5" style={{ color: "inherit" }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DropdownControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const selectedId = draft.choice_ids?.[0];
  const selected = question.choices.find((choice) => choice.id === selectedId);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);

  const filtered = question.choices.filter((choice) =>
    choice.label.toLowerCase().includes(filter.toLowerCase()),
  );

  const select = (id: number) => {
    onChange({ choice_ids: [id] });
    setOpen(false);
    setFilter("");
    setTimeout(onAdvance, 380);
  };

  return (
    <div className="relative max-w-[560px]">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <div
        className="relative z-20 flex items-center gap-2 rounded-xl border-2 px-4 py-3"
        style={{ borderColor: open ? text : withAlpha(text, 0.3) }}
      >
        <input
          autoFocus
          value={open ? filter : (selected?.label ?? "")}
          placeholder="Type or select an option…"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setFilter(event.target.value);
            setOpen(true);
            setFocusIdx(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setFilter("");
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setFocusIdx((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setFocusIdx((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && filtered[focusIdx]) select(filtered[focusIdx].id);
              else if (selected) onAdvance();
            }
          }}
          className="min-w-0 flex-1 bg-transparent font-display text-[22px] outline-none placeholder:opacity-40"
        />
        <button
          type="button"
          aria-label="Toggle options"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-md p-1"
        >
          <ChevronDown
            className="h-5 w-5 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>
      {open && (
        <div
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl py-1.5 shadow-2xl"
          style={{ background: withAlpha(text, 0.96), border: `1px solid ${withAlpha(text, 0.2)}` }}
        >
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm opacity-60">No matching options</div>
          )}
          {filtered.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => select(choice.id)}
              onMouseEnter={() => setFocusIdx(filtered.indexOf(choice))}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-display text-lg transition-colors"
              style={{
                background:
                  filtered[focusIdx]?.id === choice.id ? withAlpha(text, 0.08) : "transparent",
              }}
            >
              <span>{choice.label}</span>
              {choice.id === selectedId && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YesNoControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const value = draft.value;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [question.id]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={(event) => {
        const key = event.key.toLowerCase();
        if (key === "y") {
          event.preventDefault();
          onChange({ value: "yes" });
        } else if (key === "n") {
          event.preventDefault();
          onChange({ value: "no" });
        } else if (key === "arrowdown" || key === "arrowup") {
          event.preventDefault();
          onChange({ value: value === "yes" ? "no" : "yes" });
        } else if (key === "enter") {
          event.preventDefault();
          if (!question.required && !value) onAdvance();
          else if (value) onAdvance();
        }
      }}
      className="flex max-w-[420px] gap-3 outline-none"
    >
      {(["yes", "no"] as const).map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange({ value: option })}
          className="flex flex-1 items-center gap-3 rounded-xl border-2 px-5 py-4 font-display text-xl transition-all duration-150"
          style={{
            borderColor: value === option ? text : withAlpha(text, 0.14),
            background: value === option ? withAlpha(text, 0.07) : "transparent",
          }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md border-[1.5px] text-xs font-semibold"
            style={{ borderColor: withAlpha(text, 0.4) }}
          >
            {index === 0 ? "Y" : "N"}
          </span>
          {option === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function RatingControl({ question, draft, onChange, onAdvance, text }: ControlProps) {
  const max = question.config?.max_rating ?? 5;
  const value = Number(draft.value ?? 0);
  const [hover, setHover] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [question.id]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={(event) => {
        if (/^[1-9]$/.test(event.key) && Number(event.key) <= max) {
          event.preventDefault();
          onChange({ value: event.key });
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          onChange({ value: String(Math.min(value + 1, max)) });
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          onChange({ value: String(Math.max(value - 1, 1)) });
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (!question.required || value >= 1) onAdvance();
        }
      }}
      onMouseLeave={() => setHover(0)}
      className="max-w-[560px] outline-none"
    >
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }).map((_, index) => {
          const active = (hover || value) > index;
          return (
            <button
              key={index}
              type="button"
              aria-label={`Rate ${index + 1}`}
              onMouseEnter={() => setHover(index + 1)}
              onClick={() => onChange({ value: String(index + 1) })}
              className="transition-transform active:scale-90"
            >
              <Star
                className="h-10 w-10 md:h-11 md:w-11"
                style={{ color: active ? text : withAlpha(text, 0.35) }}
                fill={active ? text : "none"}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      {(hover || value) > 0 && (
        <p className="mt-3 text-sm opacity-60">
          {hover || value} of {max}
        </p>
      )}
    </div>
  );
}

export function AnswerControl(props: ControlProps) {
  switch (props.question.qtype) {
    case "short_text":
    case "email":
    case "number":
      return <TextInputControl {...props} />;
    case "long_text":
      return <LongTextControl {...props} />;
    case "multiple_choice":
      return <ChoiceControl {...props} />;
    case "dropdown":
      return <DropdownControl {...props} />;
    case "yes_no":
      return <YesNoControl {...props} />;
    case "rating":
      return <RatingControl {...props} />;
    default:
      return null;
  }
}
