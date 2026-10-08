"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import type { FormDetail, ResponseRow } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const { id, responseId } = use(params);
  const formId = Number(id);
  const router = useRouter();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [response, setResponse] = useState<ResponseRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getForm(formId), api.getResponse(formId, Number(responseId))])
      .then(([formDetail, responseDetail]) => {
        if (!active) return;
        setForm(formDetail);
        setResponse(responseDetail);
      })
      .catch(() => {
        if (active) {
          toast.error("Couldn’t load this response.");
          router.push(`/forms/${formId}/results`);
        }
      });
    return () => {
      active = false;
    };
  }, [formId, responseId, router]);

  const remove = useCallback(async () => {
    try {
      await api.deleteResponse(formId, Number(responseId));
      toast.success("Response deleted.");
      router.push(`/forms/${formId}/results`);
    } catch {
      toast.error("Couldn’t delete this response.");
    }
  }, [formId, responseId, router]);

  if (!form || !response) {
    return (
      <div className="flex h-screen items-center justify-center bg-app">
        <span className="animate-pulse-soft text-sm text-ink3">Loading response…</span>
      </div>
    );
  }

  const answerByQuestion = new Map(response.answers.map((answer) => [answer.question_id, answer]));

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3.5">
          <button
            type="button"
            onClick={() => router.push(`/forms/${formId}/results`)}
            aria-label="Back to results"
            className="rounded-lg p-2 text-ink2 transition-colors hover:bg-black/5 hover:text-ink"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div>
            <h1 className="text-[15px] font-semibold text-ink">Response #{response.id}</h1>
            <p className="text-xs text-ink3">
              {response.is_complete
                ? `Submitted ${formatDateTime(response.submitted_at)}`
                : `Started ${formatDateTime(response.started_at)} · partial`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-inputline px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {form.questions.map((question, index) => {
            const answer = answerByQuestion.get(question.id);
            const choiceLabels = question.choices
              .filter((choice) => answer?.choice_ids.includes(choice.id))
              .map((choice) => choice.label);
            const text =
              answer?.value?.trim() || (choiceLabels.length > 0 ? choiceLabels.join(", ") : "");
            return (
              <div key={question.id} className="border-b border-line px-6 py-5 last:border-b-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-ink3">{index + 1}</span>
                  <span className="text-[13px] text-ink2">{question.title}</span>
                </div>
                <div className="mt-2 pl-5 text-lg font-medium text-ink">
                  {text || <span className="text-base font-normal italic text-ink3">Skipped</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete this response?">
        <p className="text-sm leading-relaxed text-ink2">
          This response will be permanently removed from the form’s results. This can’t be
          undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="rounded-lg px-4 py-2.5 text-sm text-ink2 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-danger/85"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
