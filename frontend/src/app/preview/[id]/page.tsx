"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { RespondentFlow } from "@/components/respondent/RespondentFlow";
import { api } from "@/lib/api";
import type { FormDetail } from "@/lib/types";

export default function PreviewFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const formId = Number(id);
  const [form, setForm] = useState<FormDetail | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getForm(formId)
      .then((detail) => {
        if (active) setForm(detail);
      })
      .catch(() => {
        if (active) toast.error("Couldn’t load the preview.");
      });
    return () => {
      active = false;
    };
  }, [formId]);

  if (!form) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-app">
        <span className="animate-pulse-soft text-sm text-ink3">Loading preview…</span>
      </div>
    );
  }

  const publicShape = {
    slug: form.slug,
    title: form.title,
    welcome_title: form.welcome_title,
    welcome_description: form.welcome_description,
    welcome_button_text: form.welcome_button_text,
    thank_you_title: form.thank_you_title,
    thank_you_description: form.thank_you_description,
    theme: form.theme,
    questions: form.questions,
  };

  return <RespondentFlow form={publicShape} preview />;
}
