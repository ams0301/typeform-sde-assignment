"use client";

import { Home, Puzzle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: Home, label: "Home", active: true },
  { icon: Sparkles, label: "Templates", soon: true },
  { icon: Puzzle, label: "Integrations", soon: true },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-app px-4 py-5 md:flex">
      <div className="px-2 pb-6 pt-1">
        <span className="font-display text-[22px] font-bold tracking-tight text-ink">typeform</span>
        <span className="font-display text-[22px] font-bold text-ink3">.</span>
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              item.active ? "bg-black/6 font-medium text-ink" : "text-ink2",
              !item.active && "cursor-default",
            )}
          >
            <item.icon className={cn("h-[18px] w-[18px]", item.active ? "text-ink" : "text-ink3")} />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="rounded-full bg-black/6 px-2 py-0.5 text-[10px] font-medium text-ink3">
                Soon
              </span>
            )}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
          AS
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-ink">Aadarsh</div>
          <div className="truncate text-[11px] text-ink3">asinha_be23@thapar.edu</div>
        </div>
      </div>
    </aside>
  );
}
