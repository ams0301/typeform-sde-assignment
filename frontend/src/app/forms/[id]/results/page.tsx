"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsesTable } from "@/components/results/ResponsesTable";
import { SummaryTab } from "@/components/results/SummaryTab";
import { api } from "@/lib/api";
import type { FormDetail, FormStats, ResponseRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const formId = Number(id);
  const router = useRouter();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [responses, setResponses] = useState<ResponseRow[] | null>(null);
  const [tab, setTab] = useState<"summary" | "responses">("summary");

  useEffect(() => {
    let active = true;
    Promise.all([api.getForm(formId), api.getStats(formId), api.listResponses(formId)])
      .then(([formDetail, formStats, formResponses]) => {
        if (!active) return;
        setForm(formDetail);
        setStats(formStats);
        setResponses(formResponses);
      })
      .catch(() => {
        if (active) toast.error("Couldn’t load results. Is the backend running?");
      });
    return () => {
      active = false;
    };
  }, [formId]);

  if (!form || !stats || !responses) {
    return (
      <div className="flex h-screen items-center justify-center bg-app">
        <span className="animate-pulse-soft text-sm text-ink3">Loading results…</span>
      </div>
    );
  }

  const isLive = form.status === "published";

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3.5">
          <button
            type="button"
            onClick={() => router.push(`/forms/${form.id}/edit`)}
            aria-label="Back to builder"
            className="rounded-lg p-2 text-ink2 transition-colors hover:bg-black/5 hover:text-ink"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-ink">{form.title}</h1>
            <p className="text-xs text-ink3">Results</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex",
                isLive ? "bg-live/10 text-live" : "bg-black/6 text-ink3",
              )}
            >
              <span className={cn("h-[7px] w-[7px] rounded-full", isLive ? "bg-live" : "bg-ink3")} />
              {isLive ? "Live" : "Draft"}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/to/${form.slug}`)
                  .then(
                    () => toast.success("Public link copied to clipboard."),
                    () => toast.error("Couldn’t copy the link."),
                  );
              }}
              className="flex items-center gap-1.5 rounded-lg border border-inputline px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-black/5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <a
              href={`/api/forms/${form.id}/export.csv`}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black/75"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {(
            [
              ["summary", "Summary"],
              ["responses", `Responses (${responses.filter((r) => r.is_complete).length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "relative px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === key ? "text-ink" : "text-ink3 hover:text-ink2",
              )}
            >
              {label}
              {tab === key && (
                <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        {tab === "summary" ? <SummaryTab stats={stats} /> : <ResponsesTable form={form} responses={responses} />}
      </main>
    </div>
  );
}
