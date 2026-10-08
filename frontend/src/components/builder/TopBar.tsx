"use client";

import { ArrowLeft, Eye, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormDetail } from "@/lib/types";

interface TopBarProps {
  form: FormDetail;
  saveState: "idle" | "saving" | "saved";
  onBack: () => void;
  onTitleChange: (title: string) => void;
  onShare: () => void;
  onPublish: () => void;
}

export function TopBar({ form, saveState, onBack, onTitleChange, onShare, onPublish }: TopBarProps) {
  const isLive = form.status === "published";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to workspace"
        className="rounded-lg p-2 text-ink2 transition-colors hover:bg-black/5 hover:text-ink"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <div className="mx-1 h-5 w-px bg-line" />
      <input
        value={form.title}
        onChange={(event) => onTitleChange(event.target.value)}
        aria-label="Form title"
        className="w-64 rounded-md px-2 py-1.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-black/5 focus:bg-black/5"
      />
      <span className="ml-1 text-xs text-ink3">
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
      </span>

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
        <a
          href={`/preview/${form.id}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-inputline px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-black/5"
        >
          <Eye className="h-4 w-4" />
          Preview
        </a>
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-lg border border-inputline px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-black/5"
        >
          <Link2 className="h-4 w-4" />
          Share
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-black/75 active:scale-[0.98]"
        >
          {isLive ? "Published ✓" : "Publish"}
        </button>
      </div>
    </header>
  );
}
