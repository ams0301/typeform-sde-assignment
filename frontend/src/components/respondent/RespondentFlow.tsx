"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import type { PublicForm, Question } from "@/lib/types";
import { cn, withAlpha } from "@/lib/utils";
import { AnswerControl } from "./AnswerControls";
import { validateAnswerClient, type AnswerDraft } from "./validation";

interface RespondentFlowProps {
  form: PublicForm;
  preview?: boolean;
}

type Slide =
  | { kind: "welcome" }
  | { kind: "question"; question: Question }
  | { kind: "thankyou" };

function isDark(hex: string | undefined): boolean {
  if (!hex) return false;
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}

export function RespondentFlow({ form, preview = false }: RespondentFlowProps) {
  const hasWelcome = Boolean(form.welcome_title.trim() || form.welcome_description.trim());
  const slides = useMemo<Slide[]>(
    () => [
      ...(hasWelcome ? [{ kind: "welcome" } as Slide] : []),
      ...form.questions.map((question) => ({ kind: "question", question }) as Slide),
      { kind: "thankyou" } as Slide,
    ],
    [form, hasWelcome],
  );

  const background = form.theme.background || "#FFFFFF";
  const dark = isDark(background);
  const text = form.theme.text || (dark ? "#FFFFFF" : "#1A1A1A");
  const button = form.theme.button || "#111111";
  const buttonText = form.theme.button_text || (isDark(button) ? "#FFFFFF" : "#1A1A1A");
  const fontClass =
    form.theme.font === "mono"
      ? "font-mono"
      : form.theme.font === "serif"
        ? "font-serif"
        : "font-display";
  const errorColor = dark ? "#FF9F97" : "#D64545";

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [drafts, setDrafts] = useState<Record<number, AnswerDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const visitedRef = useRef<number[]>([]);
  const responseIdRef = useRef<number | null>(null);

  const slide = slides[Math.min(current, slides.length - 1)];
  const question = slide.kind === "question" ? slide.question : null;
  const totalQuestions = form.questions.length;
  const currentQuestionIndex = question
    ? form.questions.findIndex((item) => item.id === question.id)
    : -1;

  useEffect(() => {
    if (preview) return;
    let active = true;
    api
      .startResponse(form.slug)
      .then((result) => {
        if (active) responseIdRef.current = result.response_id;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [form.slug, preview]);

  const setDraft = useCallback((questionId: number, patch: Partial<AnswerDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), ...patch },
    }));
  }, []);

  const bumpError = useCallback((message: string) => {
    setError(message);
    setErrorTick((tick) => tick + 1);
  }, []);

  const slideIndexOfQuestion = useCallback(
    (questionId: number) =>
      slides.findIndex((item) => item.kind === "question" && item.question.id === questionId),
    [slides],
  );

  const resolveNextIndex = useCallback(
    (target: Question, draft: AnswerDraft): number | null => {
      const config = target.config ?? {};
      const selected = draft.choice_ids ?? [];
      if (selected.length === 1) {
        const rules = config.logic ?? [];
        const rule = rules.find((item) => item.choice_id === selected[0]);
        if (rule) {
          const index = slideIndexOfQuestion(rule.target_question_id);
          if (index >= 0) return index;
        }
      }
      if (config.always_jump) {
        const index = slideIndexOfQuestion(config.always_jump);
        if (index >= 0) return index;
      }
      return null;
    },
    [slideIndexOfQuestion],
  );

  const submitAll = useCallback(async () => {
    if (preview) {
      setDirection(1);
      setCurrent(slides.length - 1);
      return;
    }
    setSubmitting(true);
    try {
      const answers = form.questions
        .filter((item) => {
          const draft = drafts[item.id];
          if (!draft) return false;
          if (draft.choice_ids && draft.choice_ids.length > 0) return true;
          if (draft.value && draft.value.trim()) return true;
          return false;
        })
        .map((item) => ({
          question_id: item.id,
          value: drafts[item.id]?.value ?? null,
          choice_ids: drafts[item.id]?.choice_ids ?? [],
        }));
      const visited = new Set(visitedRef.current);
      const path = form.questions
        .filter((item) => visited.has(item.id) || drafts[item.id])
        .map((item) => item.id);
      await api.submitResponse(form.slug, {
        response_id: responseIdRef.current,
        answers,
        path,
      });
      setDirection(1);
      setCurrent(slides.length - 1);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        const detail = caught.detail as { answers?: { question_id: number; message: string }[] };
        const first = detail?.answers?.[0];
        if (first) {
          const index = slideIndexOfQuestion(first.question_id);
          if (index >= 0) {
            setDirection(-1);
            setCurrent(index);
            bumpError(first.message);
          } else {
            toast.error("Something went wrong — please check your answers.");
          }
        } else {
          toast.error("Something went wrong — please check your answers.");
        }
      } else {
        toast.error("Couldn’t submit your response. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [bumpError, drafts, form.questions, form.slug, preview, slideIndexOfQuestion, slides.length]);

  const advance = useCallback(async () => {
    if (submitting) return;
    if (slide.kind === "welcome") {
      setError(null);
      setDirection(1);
      setCurrent((value) => value + 1);
      return;
    }
    if (slide.kind !== "question" || !question) return;

    const draft = drafts[question.id] ?? {};
    const problem = validateAnswerClient(question, draft);
    if (problem) {
      bumpError(problem);
      return;
    }
    setError(null);
    if (!visitedRef.current.includes(question.id)) {
      visitedRef.current.push(question.id);
    }

    const target = resolveNextIndex(question, draft);
    const nextIndex = target ?? current + 1;
    if (nextIndex >= slides.length - 1) {
      await submitAll();
      return;
    }
    setDirection(1);
    setCurrent(nextIndex);
  }, [
    bumpError,
    current,
    drafts,
    question,
    resolveNextIndex,
    slide,
    slides.length,
    submitAll,
    submitting,
  ]);

  const back = useCallback(() => {
    if (current === 0 || submitting) return;
    setError(null);
    setDirection(-1);
    setCurrent((value) => value - 1);
  }, [current, submitting]);

  const thankYouName = useMemo(() => {
    const nameQuestion = form.questions.find(
      (item) => item.qtype === "short_text" && drafts[item.id]?.value?.trim(),
    );
    const raw = nameQuestion ? (drafts[nameQuestion.id]?.value ?? "").trim() : "";
    return raw.split(/\s+/)[0] || "friend";
  }, [drafts, form.questions]);

  const thankYouTitle = form.thank_you_title.replace(/\{\{\s*name\s*\}\}/g, thankYouName);

  const slideVariants = {
    enter: (dir: number) => ({ y: dir > 0 ? 96 : -96, opacity: 0, scale: 0.985 }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ y: dir > 0 ? -96 : 96, opacity: 0, scale: 0.985 }),
  };

  return (
    <div
      className={cn("relative h-[100dvh] select-none overflow-hidden", fontClass)}
      style={{ background, color: text }}
    >
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.div
          key={`${slide.kind}-${current}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 overflow-y-auto"
        >
          {slide.kind === "welcome" && (
            <div className="flex min-h-full flex-col justify-center px-6 py-24 md:px-14">
              <div className="mx-auto w-full max-w-[620px]">
                <h1 className="whitespace-pre-wrap text-[34px] font-semibold leading-tight md:text-[42px]">
                  {form.welcome_title}
                </h1>
                {form.welcome_description && (
                  <p className="mt-4 text-lg opacity-75 md:text-xl">{form.welcome_description}</p>
                )}
              </div>
            </div>
          )}

          {slide.kind === "question" && question && (
            <div className="flex min-h-full flex-col justify-center px-6 py-24 md:px-14">
              <div className="mx-auto w-full max-w-[620px]">
                <h1 className="whitespace-pre-wrap text-[26px] font-semibold leading-tight md:text-[32px]">
                  {question.title}
                </h1>
                {question.description && (
                  <p className="mt-3 text-[15px] opacity-70 md:text-base">
                    {question.description}
                  </p>
                )}
                <div className="mt-9">
                  <AnswerControl
                    key={question.id}
                    question={question}
                    draft={drafts[question.id] ?? {}}
                    onChange={(patch) => setDraft(question.id, patch)}
                    onAdvance={() => void advance()}
                    text={text}
                  />
                </div>
                {error && (
                  <p
                    key={errorTick}
                    className="mt-4 animate-shake text-sm font-medium"
                    style={{ color: errorColor }}
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {slide.kind === "thankyou" && (
            <div className="flex min-h-full flex-col justify-center px-6 py-24 md:px-14">
              <div className="mx-auto w-full max-w-[620px]">
                <h1 className="whitespace-pre-wrap text-[34px] font-semibold leading-tight md:text-[42px]">
                  {thankYouTitle}
                </h1>
                {form.thank_you_description && (
                  <p className="mt-4 text-lg opacity-75 md:text-xl">{form.thank_you_description}</p>
                )}
                {preview && (
                  <p className="mt-8 text-sm opacity-50">
                    This is a preview — responses aren’t collected.
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slide.kind === "question" && totalQuestions > 0 && (
        <div
          className="absolute right-8 top-7 hidden h-1.5 w-[160px] overflow-hidden rounded-full md:block"
          style={{ background: withAlpha(text, 0.15) }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              background: withAlpha(text, 0.85),
            }}
          />
        </div>
      )}

      {preview && (
        <span
          className="absolute left-8 top-7 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: withAlpha(text, 0.12) }}
        >
          Preview
        </span>
      )}

      {slide.kind === "welcome" ? (
        <button
          type="button"
          onClick={() => void advance()}
          className="fixed bottom-9 right-8 flex items-center gap-2.5 rounded-full px-7 py-4 font-display text-base font-semibold transition-transform active:scale-95 md:bottom-11 md:right-11"
          style={{ background: button, color: buttonText }}
        >
          {form.welcome_button_text || "Start"}
          <ArrowRight className="h-[18px] w-[18px]" />
        </button>
      ) : slide.kind === "question" ? (
        <button
          type="button"
          onClick={() => void advance()}
          disabled={submitting}
          aria-label="OK — continue"
          className="fixed bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-xl transition-transform active:scale-95 disabled:opacity-70 md:bottom-10 md:right-10"
          style={{ background: button, color: buttonText }}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          )}
        </button>
      ) : null}

      {slide.kind === "question" && current > (hasWelcome ? 1 : 0) && (
        <button
          type="button"
          onClick={back}
          aria-label="Back to previous question"
          className="fixed bottom-9 left-8 flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 md:bottom-11 md:left-10"
          style={{ borderColor: withAlpha(text, 0.25), background: withAlpha(text, 0.04) }}
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
      )}

      {slide.kind !== "question" && (
        <span className="fixed bottom-9 left-8 font-display text-sm font-bold tracking-tight opacity-50 md:left-10">
          typeform.
        </span>
      )}
    </div>
  );
}
