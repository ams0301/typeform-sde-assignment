"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Sidebar } from "@/components/home/Sidebar";
import { FormCard } from "@/components/home/FormCard";
import { api } from "@/lib/api";
import type { FormSummary } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<FormSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listForms()
      .then((list) => {
        if (active) setForms(list);
      })
      .catch(() => {
        if (active) toast.error("Couldn’t load your forms. Is the backend running?");
      });
    return () => {
      active = false;
    };
  }, []);

  const createForm = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const form = await api.createForm("Untitled form");
      router.push(`/forms/${form.id}/edit`);
    } catch {
      toast.error("Couldn’t create the form.");
      setCreating(false);
    }
  };

  const duplicateForm = async (id: number) => {
    try {
      const copy = await api.duplicateForm(id);
      setForms((current) => (current ? [...current, copy] : [copy]));
      toast.success("Form duplicated.");
    } catch {
      toast.error("Couldn’t duplicate this form.");
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/to/${slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Public link copied to clipboard."),
      () => toast.error("Couldn’t copy the link."),
    );
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) return;
    try {
      await api.patchForm(renameTarget.id, { title });
      setForms((current) =>
        current?.map((form) => (form.id === renameTarget.id ? { ...form, title } : form)) ?? null,
      );
      toast.success("Form renamed.");
    } catch {
      toast.error("Couldn’t rename this form.");
    }
    setRenameTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await api.deleteForm(id);
      setForms((current) => current?.filter((form) => form.id !== id) ?? null);
      toast.success("Form deleted.");
    } catch {
      toast.error("Couldn’t delete this form.");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-12">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Your workspace
          </h1>
          <p className="mt-1 text-sm text-ink2">
            Create forms people actually enjoy filling out.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={createForm}
            disabled={creating}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-inputline bg-transparent text-ink2 transition-colors hover:border-ink/40 hover:text-ink"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-inputline">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">Create new form</span>
          </button>

          {forms === null
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] animate-pulse-soft rounded-xl border border-line bg-white/60"
                />
              ))
            : forms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onRenamed={(id, title) => {
                    const target = forms.find((candidate) => candidate.id === id) ?? null;
                    setRenameTarget(target);
                    setRenameValue(title);
                  }}
                  onDuplicated={() => duplicateForm(form.id)}
                  onDeleted={(id) => {
                    const target = forms.find((candidate) => candidate.id === id) ?? null;
                    setDeleteTarget(target);
                  }}
                  onCopyLink={copyLink}
                />
              ))}
        </div>

        <Modal
          open={renameTarget !== null}
          onClose={() => setRenameTarget(null)}
          title="Rename this form"
        >
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && saveRename()}
            className="w-full rounded-lg border border-inputline px-3 py-2.5 text-sm focus:border-ink"
            placeholder="Form name"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="rounded-lg px-4 py-2.5 text-sm text-ink2 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveRename}
              disabled={!renameValue.trim()}
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/70 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </Modal>

        <Modal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          title="Delete this form?"
        >
          <p className="text-sm leading-relaxed text-ink2">
            “{deleteTarget?.title}” and all of its responses will be permanently deleted. This
            can’t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg px-4 py-2.5 text-sm text-ink2 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-danger/85"
            >
              Delete
            </button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
