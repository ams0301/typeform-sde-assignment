"use client";

import { use, useEffect, useState } from "react";
import { RespondentFlow } from "@/components/respondent/RespondentFlow";
import { api } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [form, setForm] = useState<PublicForm | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getPublicForm(slug)
      .then((data) => {
        if (active) setForm(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (failed) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-[#262626] px-6 text-center text-white">
        <span className="font-display text-lg font-bold tracking-tight">typeform.</span>
        <h1 className="font-display text-2xl font-semibold">This form isn’t here.</h1>
        <p className="max-w-sm text-sm text-white/60">
          It may have been unpublished, renamed, or it never existed. Double-check the link
          you were sent.
        </p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#262626]">
        <span className="animate-pulse-soft font-display text-lg font-bold text-white/70">
          typeform.
        </span>
      </div>
    );
  }

  return <RespondentFlow form={form} />;
}
