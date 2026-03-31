"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";

type ColumnId = "todo" | "inProgress" | "done";
type Priority = "Low" | "Medium" | "High";
type ColorTag = "slate" | "blue" | "green" | "amber" | "rose";

type Task = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  colorTag: ColorTag;
  columnId: ColumnId;
};

type TaskFormState = Omit<Task, "id" | "columnId">;

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "inProgress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

const COLOR_TAG_STYLES: Record<ColorTag, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  priority: "Medium",
  assignee: "",
  colorTag: "blue",
};

const STORAGE_KEY = "kanban-board-tasks";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Column({ id, label, count, children }: { id: ColumnId; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[350px] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 ${
        isOver ? "ring-2 ring-blue-400" : ""
      }`}
    >
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{label}</h2>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{count}</span>
      </header>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}

function TaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow"
      onClick={() => onOpen(task)}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task);
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold text-slate-800">{task.title}</h3>
        <span className="cursor-grab select-none text-slate-400 hover:text-slate-600" aria-hidden>
          ⋮⋮
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${COLOR_TAG_STYLES[task.colorTag]}`} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
      </div>
      <div className="flex items-center justify-end">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {getInitials(task.assignee)}
        </span>
      </div>
    </article>
  );
}

function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, updates: TaskFormState) => void;
  onDelete: (taskId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TaskFormState>({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignee: task.assignee,
    colorTag: task.colorTag,
  });

  useEffect(() => {
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assignee,
      colorTag: task.colorTag,
    });
    setIsEditing(false);
  }, [task]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Task Details</h2>
          <button className="text-slate-500 hover:text-slate-700" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {isEditing ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.title.trim() || !form.assignee.trim()) return;
              onSave(task.id, {
                ...form,
                title: form.title.trim(),
                description: form.description.trim(),
                assignee: form.assignee.trim(),
              });
              setIsEditing(false);
            }}
          >
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <textarea
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as Priority }))}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Assignee"
                value={form.assignee}
                onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                required
              />
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.colorTag}
                onChange={(event) => setForm((prev) => ({ ...prev, colorTag: event.target.value as ColorTag }))}
              >
                <option value="slate">Slate</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">{task.title}</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{task.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{task.assignee}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${COLOR_TAG_STYLES[task.colorTag]}`} />
                Tag
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  onDelete(task.id);
                  onClose();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: Task[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTasks(
            parsed.filter(
              (task): task is Task =>
                Boolean(task?.id) &&
                typeof task.title === "string" &&
                typeof task.description === "string" &&
                (task.priority === "Low" || task.priority === "Medium" || task.priority === "High") &&
                typeof task.assignee === "string" &&
                ["slate", "blue", "green", "amber", "rose"].includes(task.colorTag) &&
                ["todo", "inProgress", "done"].includes(task.columnId),
            ),
          );
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [hasLoaded, tasks]);

  const tasksByColumn = useMemo(
    () =>
      COLUMNS.reduce<Record<ColumnId, Task[]>>(
        (acc, column) => {
          acc[column.id] = tasks.filter((task) => task.columnId === column.id);
          return acc;
        },
        { todo: [], inProgress: [], done: [] },
      ),
    [tasks],
  );

  const onAddTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.assignee.trim()) return;

    setTasks((prev) => [
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignee: form.assignee.trim(),
        colorTag: form.colorTag,
        columnId: "todo",
      },
      ...prev,
    ]);

    setForm(DEFAULT_FORM);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const targetColumn = COLUMNS.some((column) => column.id === overId)
      ? (overId as ColumnId)
      : tasks.find((task) => task.id === overId)?.columnId;

    if (!targetColumn) return;

    setTasks((prev) => prev.map((task) => (task.id === active.id ? { ...task, columnId: targetColumn } : task)));
  };

  const updateTask = (taskId: string, updates: TaskFormState) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...updates } : prev));
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setSelectedTask((prev) => (prev?.id === taskId ? null : prev));
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
          <p className="mt-1 text-sm text-slate-600">Organize tasks by progress, assign owners, and drag cards across columns.</p>

          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={onAddTask}>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Task title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Assignee name"
              value={form.assignee}
              onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as Priority }))}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.colorTag}
              onChange={(event) => setForm((prev) => ({ ...prev, colorTag: event.target.value as ColorTag }))}
            >
              <option value="slate">Slate</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add Task
            </button>
            <textarea
              className="sm:col-span-2 lg:col-span-5 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </form>
        </header>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <section className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <Column key={column.id} id={column.id} label={column.label} count={tasksByColumn[column.id].length}>
                {tasksByColumn[column.id].map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={setSelectedTask} />
                ))}
              </Column>
            ))}
          </section>
        </DndContext>
      </div>

      {selectedTask ? (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onSave={updateTask} onDelete={deleteTask} />
      ) : null}
    </main>
  );
}
