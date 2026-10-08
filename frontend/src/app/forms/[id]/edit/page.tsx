"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Canvas } from "@/components/builder/Canvas";
import { ContentPanel, type Selection } from "@/components/builder/ContentPanel";
import { TopBar } from "@/components/builder/TopBar";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { ApiError, api, type FormPatch, type QuestionPayload } from "@/lib/api";
import type { Choice, FormDetail, Question, QuestionType } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

export default function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const formId = Number(id);
  const router = useRouter();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [selected, setSelected] = useState<Selection>("welcome");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState("");

  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ form?: FormPatch; questions?: Map<number, Record<string, unknown>> }>({});

  useEffect(() => {
    let active = true;
    api
      .getForm(formId)
      .then((detail) => {
        if (active) setForm(detail);
      })
      .catch(() => {
        toast.error("Couldn’t load this form.");
        router.push("/");
      });
    return () => {
      active = false;
    };
  }, [formId, router]);

  const save = useCallback(async () => {
    saveTimer.current = null;
    const formPatch = pending.current.form;
    const questionPatches = pending.current.questions ?? new Map();
    pending.current = {};
    if (!formPatch && questionPatches.size === 0) {
      setSaveState("saved");
      return;
    }
    try {
      if (formPatch && Object.keys(formPatch).length > 0) {
        await api.patchForm(formId, formPatch);
      }
      const updatedQuestions: Question[] = [];
      for (const [questionId, rawPatch] of questionPatches) {
        const patch = { ...(rawPatch as Record<string, unknown>) };
        if (Array.isArray(patch.choices)) {
          patch.choices = (patch.choices as Choice[]).map((choice) => choice.label);
        }
        updatedQuestions.push(await api.updateQuestion(questionId, patch));
      }
      if (updatedQuestions.length > 0) {
        setForm((current) =>
          current
            ? {
                ...current,
                questions: current.questions.map((question) => {
                  const updated = updatedQuestions.find((item) => item.id === question.id);
                  // If the user kept typing while this save was in flight, their
                  // local edits are newer — don't clobber them with the response.
                  if (!updated || pending.current.questions?.has(question.id)) return question;
                  return { ...question, choices: updated.choices, config: updated.config };
                }),
              }
            : current,
        );
      }
      setSaveState("saved");
    } catch {
      toast.error("Couldn’t save your changes — they’ll retry with your next edit.");
      setSaveState("saved");
    }
  }, [formId]);

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 600);
  }, [save]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const editForm = useCallback(
    (patch: Record<string, unknown>) => {
      setForm((current) => (current ? ({ ...current, ...patch } as FormDetail) : current));
      pending.current.form = { ...(pending.current.form ?? {}), ...(patch as FormPatch) };
      scheduleSave();
    },
    [scheduleSave],
  );

  const editQuestion = useCallback(
    (questionId: number, patch: Record<string, unknown>) => {
      setForm((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((question) =>
                question.id === questionId ? { ...question, ...patch } : question,
              ),
            }
          : current,
      );
      const map = pending.current.questions ?? new Map();
      const merged = { ...(map.get(questionId) ?? {}), ...patch };
      map.set(questionId, merged);
      pending.current.questions = map;
      scheduleSave();
    },
    [scheduleSave],
  );

  const scrollToBlock = useCallback((selection: Selection) => {
    blockRefs.current.get(String(selection))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const addQuestion = useCallback(
    async (type: QuestionType) => {
      const payload: QuestionPayload = { qtype: type, title: "" };
      if (type === "multiple_choice" || type === "dropdown") {
        payload.choices = ["Option 1", "Option 2"];
      }
      if (type === "rating") payload.config = { max_rating: 5 };
      try {
        const question = await api.addQuestion(formId, payload);
        setForm((current) =>
          current
            ? {
                ...current,
                questions: [...current.questions, question],
                question_count: current.questions.length + 1,
              }
            : current,
        );
        setSelected(question.id);
        setTimeout(() => scrollToBlock(question.id), 80);
      } catch {
        toast.error("Couldn’t add that question.");
      }
    },
    [formId, scrollToBlock],
  );

  const deleteQuestion = useCallback(
    async (questionId: number) => {
      if (!form) return;
      const index = form.questions.findIndex((question) => question.id === questionId);
      const next =
        form.questions.length === 1
          ? "thankyou"
          : (form.questions[index + 1]?.id ?? form.questions[index - 1]?.id ?? "thankyou");
      setForm((current) =>
        current
          ? {
              ...current,
              questions: current.questions.filter((question) => question.id !== questionId),
              question_count: Math.max(0, current.questions.length - 1),
            }
          : current,
      );
      setSelected(next);
      try {
        await api.deleteQuestion(questionId);
      } catch {
        toast.error("Couldn’t delete that question.");
      }
    },
    [form],
  );

  const duplicateQuestion = useCallback(
    async (question: Question) => {
      if (!form) return;
      try {
        const copy = await api.addQuestion(formId, {
          qtype: question.qtype,
          title: question.title,
          description: question.description,
          required: question.required,
          choices: question.choices.map((choice) => choice.label),
          config: question.config,
        });
        const byId = new Map(form.questions.map((item) => [item.id, item]));
        const ids = form.questions.flatMap((item) =>
          item.id === question.id ? [item.id, copy.id] : [item.id],
        );
        const ordered = ids.map((qid, position) => ({
          ...(byId.get(qid) ?? copy),
          position,
        }));
        setForm((current) =>
          current
            ? {
                ...current,
                questions: ordered,
                question_count: ordered.length,
              }
            : current,
        );
        await api.reorderQuestions(formId, ids);
        setSelected(copy.id);
        setTimeout(() => scrollToBlock(copy.id), 80);
      } catch {
        toast.error("Couldn’t duplicate that question.");
      }
    },
    [form, formId, scrollToBlock],
  );

  const handleReorder = useCallback(
    async (questionIds: number[]) => {
      if (!form) return;
      const byId = new Map(form.questions.map((question) => [question.id, question]));
      const ordered = questionIds.map((qid, position) => ({ ...byId.get(qid)!, position }));
      setForm((current) => (current ? { ...current, questions: ordered } : current));
      try {
        await api.reorderQuestions(formId, questionIds);
      } catch {
        toast.error("Couldn’t reorder questions.");
      }
    },
    [form, formId],
  );

  const publicUrl = useCallback(
    (slug: string) => `${window.location.origin}/to/${slug}`,
    [],
  );

  const copyToClipboard = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard."),
      () => toast.error("Couldn’t copy the link."),
    );
  }, []);

  const publish = useCallback(async () => {
    if (!form) return;
    try {
      await save();
      const updated = await api.publishForm(formId);
      setForm((current) =>
        current
          ? { ...current, status: "published", published_at: updated.published_at, slug: updated.slug }
          : current,
      );
      const url = publicUrl(updated.slug);
      setPublishUrl(url);
      setPublishOpen(true);
      navigator.clipboard?.writeText(url).catch(() => {});
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      const message =
        detail && typeof detail === "object" && "detail" in (detail as Record<string, unknown>)
          ? String((detail as Record<string, unknown>).detail)
          : "Couldn’t publish this form.";
      toast.error(message);
    }
  }, [form, formId, publicUrl, save]);

  const unpublish = useCallback(async () => {
    try {
      await api.unpublishForm(formId);
      setForm((current) => (current ? { ...current, status: "draft" } : current));
      toast.success("Form unpublished — the public link is now closed.");
    } catch {
      toast.error("Couldn’t unpublish this form.");
    }
  }, [formId]);

  const registerRef = useCallback((key: string, element: HTMLElement | null) => {
    if (element) blockRefs.current.set(key, element);
    else blockRefs.current.delete(key);
  }, []);

  if (!form) {
    return (
      <div className="flex h-screen items-center justify-center bg-app">
        <span className="animate-pulse-soft text-sm text-ink3">Loading your form…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <TopBar
        form={form}
        saveState={saveState}
        onBack={() => router.push("/")}
        onTitleChange={(title) => editForm({ title })}
        onShare={() => setShareOpen(true)}
        onPublish={form.status === "published" ? () => setShareOpen(true) : publish}
      />
      <div className="flex min-h-0 flex-1">
        <ContentPanel
          form={form}
          selected={selected}
          onSelect={setSelected}
          onScrollTo={scrollToBlock}
          onAdd={addQuestion}
          onReorder={handleReorder}
          onDeleteQuestion={deleteQuestion}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Canvas
            form={form}
            selected={selected}
            onSelect={setSelected}
            onEditForm={editForm}
            onEditQuestion={editQuestion}
            onDeleteQuestion={deleteQuestion}
            onDuplicateQuestion={duplicateQuestion}
            registerRef={registerRef}
          />
        </main>
        <SettingsPanel
          form={form}
          selected={selected}
          onEditForm={editForm}
          onEditQuestion={editQuestion}
          onDeleteQuestion={deleteQuestion}
        />
      </div>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="You’re live 🎉">
        <p className="text-sm leading-relaxed text-ink2">
          Anyone with this link can now fill in your form — no login needed.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={publishUrl}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-inputline px-3 py-2.5 text-sm text-ink2"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(publishUrl)}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/75"
          >
            Copy
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <a
            href={publishUrl}
            target="_blank"
            className="rounded-lg border border-inputline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-black/5"
          >
            View form
          </a>
          <button
            type="button"
            onClick={() => setPublishOpen(false)}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/75"
          >
            Done
          </button>
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ink">Public link</div>
            <div className="text-xs text-ink3">Anyone with the link can respond</div>
          </div>
          <Toggle
            checked={form.status === "published"}
            onChange={(checked) => (checked ? publish() : unpublish())}
          />
        </div>
        {form.status === "published" ? (
          <div className="mt-4 flex gap-2">
            <input
              readOnly
              value={publicUrl(form.slug)}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-inputline px-3 py-2.5 text-sm text-ink2"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(publicUrl(form.slug))}
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/75"
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink3">
            This form is a draft. Publish it to start collecting responses.
          </p>
        )}
      </Modal>
    </div>
  );
}
