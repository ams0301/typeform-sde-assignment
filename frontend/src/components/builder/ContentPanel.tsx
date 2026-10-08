"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, GripVertical, Hand, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { QUESTION_TYPE_META, typeMeta } from "@/lib/questionTypes";
import type { FormDetail, Question, QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Selection = number | "welcome" | "thankyou";

interface ContentPanelProps {
  form: FormDetail;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onScrollTo: (selection: Selection) => void;
  onAdd: (type: QuestionType) => void;
  onReorder: (questionIds: number[]) => void;
  onDeleteQuestion: (questionId: number) => void;
}

function ListItemShell({
  icon,
  label,
  index,
  selected,
  onClick,
  dragHandle,
  trailing,
  onDelete,
}: {
  icon: ReactNode;
  label: string;
  index?: number;
  selected: boolean;
  onClick: () => void;
  dragHandle?: ReactNode;
  trailing?: ReactNode;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors",
        selected ? "bg-white shadow-sm ring-1 ring-line" : "hover:bg-black/5",
      )}
    >
      {dragHandle}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">{icon}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] font-medium",
          label ? "text-ink" : "italic text-ink3",
        )}
      >
        {label || (index !== undefined ? "Untitled question" : "Untitled")}
      </span>
      {trailing}
      {onDelete && (
        <button
          type="button"
          aria-label="Delete question"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-md p-1 text-ink3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SortableQuestion({
  question,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  question: Question;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const meta = typeMeta(question.qtype);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-none", isDragging && "relative z-20")}
    >
      <ListItemShell
        selected={selected}
        onClick={onSelect}
        onDelete={onDelete}
        icon={
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: meta.tint, color: meta.color }}
          >
            <meta.icon className="h-4 w-4" />
          </span>
        }
        label={question.title}
        index={index}
        dragHandle={
          <button
            type="button"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            className="-ml-0.5 cursor-grab touch-none rounded p-0.5 text-ink3 opacity-0 transition-opacity hover:text-ink active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
        trailing={
          <span className="shrink-0 text-[11px] font-medium text-ink3">{index + 1}</span>
        }
      />
    </div>
  );
}

export function ContentPanel({
  form,
  selected,
  onSelect,
  onScrollTo,
  onAdd,
  onReorder,
  onDeleteQuestion,
}: ContentPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const questionIds = form.questions.map((question) => question.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questionIds.indexOf(active.id as number);
    const newIndex = questionIds.indexOf(over.id as number);
    onReorder(arrayMove(questionIds, oldIndex, newIndex));
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-line bg-app">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink3">Content</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/75"
          >
            <Plus className="h-3.5 w-3.5" />
            Add content
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setAddOpen(false)} />
              <div className="absolute right-0 z-30 mt-2 grid w-64 grid-cols-2 gap-1 rounded-2xl border border-line bg-white p-2 shadow-2xl">
                {QUESTION_TYPE_META.map((meta) => (
                  <button
                    key={meta.key}
                    type="button"
                    onClick={() => {
                      onAdd(meta.key);
                      setAddOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-black/5"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: meta.tint, color: meta.color }}
                    >
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium text-ink">{meta.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-1 p-2">
        <ListItemShell
          icon={<Hand className="h-4 w-4 text-ink2" />}
          label={form.welcome_title || "Welcome screen"}
          selected={selected === "welcome"}
          onClick={() => {
            onSelect("welcome");
            onScrollTo("welcome");
          }}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
            {form.questions.map((question, index) => (
              <SortableQuestion
                key={question.id}
                question={question}
                index={index}
                selected={selected === question.id}
                onSelect={() => {
                  onSelect(question.id);
                  onScrollTo(question.id);
                }}
                onDelete={() => onDeleteQuestion(question.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <ListItemShell
          icon={<Flag className="h-4 w-4 text-ink2" />}
          label={form.thank_you_title || "Thank you screen"}
          selected={selected === "thankyou"}
          onClick={() => {
            onSelect("thankyou");
            onScrollTo("thankyou");
          }}
        />
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-inputline py-2.5 text-xs font-medium text-ink2 transition-colors hover:border-ink/40 hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
          Add content
        </button>
      </div>
    </aside>
  );
}
