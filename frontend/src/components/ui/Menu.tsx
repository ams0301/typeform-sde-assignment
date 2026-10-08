"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Menu({ trigger, children, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-30 mt-1 min-w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon?: LucideIcon;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

export function MenuItem({ icon: Icon, label, danger, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-black/5",
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {label}
    </button>
  );
}
