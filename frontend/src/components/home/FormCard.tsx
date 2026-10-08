"use client";

import { BarChart3, Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Menu, MenuItem } from "@/components/ui/Menu";
import type { FormSummary } from "@/lib/types";
import { cn, pickTextColor, truncate } from "@/lib/utils";

interface FormCardProps {
  form: FormSummary;
  onRenamed: (id: number, title: string) => void;
  onDuplicated: () => void;
  onDeleted: (id: number) => void;
  onCopyLink: (slug: string) => void;
}

export function FormCard({ form, onRenamed, onDuplicated, onDeleted, onCopyLink }: FormCardProps) {
  const router = useRouter();
  const isLive = form.status === "published";
  const previewText = form.welcome_title || form.welcome_description || form.title;
  const textColor = form.theme.text || pickTextColor(form.theme.background);

  return (
    <div
      onClick={() => router.push(`/forms/${form.id}/edit`)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
    >
      <div
        className="flex aspect-[4/3] flex-col justify-center gap-3 p-6"
        style={{ background: form.theme.background || "#FFFFFF", color: textColor }}
      >
        <p className="font-display text-lg font-semibold leading-snug">
          {truncate(previewText, 80) || "Untitled form"}
        </p>
        {(form.welcome_title || form.welcome_description) && (
          <span
            className="w-max rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: form.theme.button || "#111111", color: form.theme.button_text || "#FFFFFF" }}
          >
            {form.welcome_button_text || "Start"} →
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{form.title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink3">
            <span
              className={cn("h-[7px] w-[7px] rounded-full", isLive ? "bg-live" : "bg-ink3")}
            />
            {isLive ? "Live" : "Draft"}
            <span>·</span>
            <span>{form.response_count} responses</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="View results"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/forms/${form.id}/results`);
            }}
            className="rounded-lg p-2 text-ink3 opacity-0 transition-opacity hover:bg-black/5 hover:text-ink group-hover:opacity-100"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <div onClick={(event) => event.stopPropagation()} className="contents">
            <Menu
              align="right"
              trigger={
                <button
                  type="button"
                  aria-label="Form menu"
                  className="rounded-lg p-2 text-ink3 transition-colors hover:bg-black/5 hover:text-ink"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            >
              <MenuItem icon={Pencil} label="Rename" onClick={() => onRenamed(form.id, form.title)} />
              <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicated} />
              {isLive && (
                <MenuItem
                  icon={ExternalLink}
                  label="Copy public link"
                  onClick={() => onCopyLink(form.slug)}
                />
              )}
              <MenuItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={() => onDeleted(form.id)}
              />
            </Menu>
          </div>
        </div>
      </div>
    </div>
  );
}
