"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormDetail, ResponseRow } from "@/lib/types";
import { formatDateTime, truncate } from "@/lib/utils";

export function ResponsesTable({ form, responses }: { form: FormDetail; responses: ResponseRow[] }) {
  const router = useRouter();

  const questionById = new Map(form.questions.map((question) => [question.id, question]));
  const choiceLabel = (questionId: number, choiceId: number) =>
    questionById.get(questionId)?.choices.find((choice) => choice.id === choiceId)?.label ?? "";

  const respondentFor = (response: ResponseRow) => {
    const first = response.answers.find(
      (answer) => answer.value?.trim() || (answer.choice_ids && answer.choice_ids.length > 0),
    );
    if (!first) return "Anonymous";
    if (first.value?.trim()) return first.value.trim();
    return choiceLabel(first.question_id, first.choice_ids[0]);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-[1fr_1.4fr_auto_32px] items-center gap-4 border-b border-line bg-app/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink3">
          <span>Submitted</span>
          <span>Respondent</span>
          <span>Status</span>
          <span />
        </div>
        {responses.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-ink3">
            No responses yet — share your form to start collecting them.
          </div>
        )}
        {responses.map((response) => (
          <button
            key={response.id}
            type="button"
            onClick={() => router.push(`/forms/${form.id}/results/${response.id}`)}
            className="grid w-full grid-cols-[1fr_1.4fr_auto_32px] items-center gap-4 border-b border-line px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-black/3"
          >
            <span className="text-sm text-ink2">
              {response.is_complete
                ? formatDateTime(response.submitted_at)
                : `Started ${formatDateTime(response.started_at)}`}
            </span>
            <span className="truncate text-sm font-medium text-ink">
              {truncate(respondentFor(response), 40)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink2">
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  response.is_complete ? "bg-live" : "bg-ink3"
                }`}
              />
              {response.is_complete ? "Completed" : "Partial"}
            </span>
            <ChevronRight className="h-4 w-4 text-ink3" />
          </button>
        ))}
      </div>
    </div>
  );
}
