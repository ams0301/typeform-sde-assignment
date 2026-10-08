"use client";

import type { FormStats, QuestionStat } from "@/lib/types";
import { typeMeta } from "@/lib/questionTypes";
import { cn, truncate } from "@/lib/utils";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink3">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink">{label}</span>
        <span className="shrink-0 tabular-nums text-ink2">
          <span className="font-semibold text-ink">{count}</span>
          <span className="mx-1 opacity-50">·</span>
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full bg-ink transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuestionStatCard({ stat }: { stat: QuestionStat }) {
  const meta = typeMeta(stat.qtype);

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug text-ink">{stat.title || "Untitled question"}</h3>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink3">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: meta.tint, color: meta.color }}
          >
            <meta.icon className="h-3 w-3" />
          </span>
          {meta.label}
        </span>
      </div>

      <div className="mt-5">
        {stat.choices && stat.choices.length > 0 && (
          <div className="space-y-3.5">
            {stat.choices.map((choice) => (
              <BarRow
                key={choice.choice_id}
                label={choice.label}
                count={choice.count}
                total={stat.answered}
              />
            ))}
          </div>
        )}

        {stat.yes_no && (
          <div className="space-y-3.5">
            <BarRow label="Yes" count={stat.yes_no.yes} total={stat.answered} />
            <BarRow label="No" count={stat.yes_no.no} total={stat.answered} />
          </div>
        )}

        {stat.rating && (
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            <div>
              <div className="font-display text-4xl font-semibold text-ink">
                {stat.rating.average}
              </div>
              <div className="mt-0.5 text-xs text-ink3">average rating</div>
            </div>
            <div className="min-w-[240px] flex-1 space-y-2">
              {Object.entries(stat.rating.distribution)
                .reverse()
                .map(([value, count]) => (
                  <div key={value} className="flex items-center gap-2.5 text-xs">
                    <span className="w-4 shrink-0 text-ink2">{value}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{
                          width: `${stat.answered > 0 ? (count / stat.answered) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular-nums text-ink3">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {stat.number && (
          <div className="flex gap-8">
            {(
              [
                ["Average", stat.number.average],
                ["Min", stat.number.min],
                ["Max", stat.number.max],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="font-display text-3xl font-semibold text-ink">{value}</div>
                <div className="mt-0.5 text-xs text-ink3">{label}</div>
              </div>
            ))}
          </div>
        )}

        {stat.text && (
          <div>
            <div className="text-sm text-ink2">
              <span className="font-semibold text-ink">{stat.text.count}</span> answered
            </div>
            {stat.text.latest.length > 0 && (
              <ul className="mt-3 space-y-2">
                {stat.text.latest.map((entry, index) => (
                  <li key={index} className="rounded-lg bg-black/4 px-3.5 py-2.5 text-sm text-ink2">
                    “{truncate(entry, 140)}”
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 text-xs text-ink3">
        {stat.answered} response{stat.answered === 1 ? "" : "s"}
        {stat.skipped > 0 && (
          <span className={cn(stat.skipped > 0 && "ml-1")}>· {stat.skipped} skipped</span>
        )}
      </div>
    </div>
  );
}

export function SummaryTab({ stats }: { stats: FormStats }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Responses" value={String(stats.total_responses)} />
        <StatCard label="Completion" value={`${Math.round(stats.completion_rate)}%`} />
        <StatCard label="Started" value={String(stats.started)} />
        <StatCard
          label="Avg. time"
          value={
            stats.average_seconds !== null
              ? `${Math.round(stats.average_seconds)}s`
              : "—"
          }
        />
      </div>

      <div className="space-y-4">
        {stats.questions.map((stat) => (
          <QuestionStatCard key={stat.question_id} stat={stat} />
        ))}
      </div>
    </div>
  );
}
