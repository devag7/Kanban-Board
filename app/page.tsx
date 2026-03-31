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
type ViewMode = "card" | "list";

type Subtask = {
  id: string;
  text: string;
  done: boolean;
};

type Comment = {
  id: string;
  text: string;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  colorTag: ColorTag;
  columnId: ColumnId;
  dueDate: string;
  subtasks: Subtask[];
  comments: Comment[];
};

type Board = {
  id: string;
  name: string;
  tasks: Task[];
};

type TaskFormState = Pick<Task, "title" | "description" | "priority" | "assignee" | "colorTag" | "dueDate">;

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
  dueDate: "",
};

const STORAGE_KEY = "kanban-board-data-v2";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isColorTag(value: string): value is ColorTag {
  return ["slate", "blue", "green", "amber", "rose"].includes(value);
}

function isColumn(value: string): value is ColumnId {
  return ["todo", "inProgress", "done"].includes(value);
}

function isPriority(value: string): value is Priority {
  return ["Low", "Medium", "High"].includes(value);
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.columnId === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  return due < today;
}

function dueLabel(task: Task) {
  if (!task.dueDate) return "No due date";
  return new Date(task.dueDate).toLocaleDateString();
}

function Column({
  id,
  label,
  count,
  children,
}: {
  id: ColumnId;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[320px] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 ${
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

function SubtaskSummary({ task, onToggle }: { task: Task; onToggle: (taskId: string, subtaskId: string) => void }) {
  const shown = task.subtasks.slice(0, 2);
  if (task.subtasks.length === 0) {
    return <p className="text-xs text-slate-500">No subtasks</p>;
  }

  return (
    <div className="space-y-1">
      {shown.map((subtask) => (
        <label key={subtask.id} className="flex items-center gap-2 text-xs text-slate-600" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={subtask.done} onChange={() => onToggle(task.id, subtask.id)} />
          <span className={subtask.done ? "line-through" : ""}>{subtask.text}</span>
        </label>
      ))}
      <p className="text-[11px] text-slate-500">
        {task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length} done
      </p>
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onToggleSubtask,
}: {
  task: Task;
  onOpen: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    transition: "transform 200ms ease, opacity 200ms ease",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="animate-fade-in cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow"
      onClick={() => onOpen(task.id)}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold text-slate-800">{task.title}</h3>
        <span className="cursor-grab select-none text-slate-400">⋮⋮</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${COLOR_TAG_STYLES[task.colorTag]}`} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
        {isOverdue(task) ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Overdue</span> : null}
      </div>
      <p className="mb-2 text-xs text-slate-500">Due: {dueLabel(task)}</p>
      <SubtaskSummary task={task} onToggle={onToggleSubtask} />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">💬 {task.comments.length}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {getInitials(task.assignee)}
        </span>
      </div>
    </article>
  );
}

function TaskListRow({
  task,
  onOpen,
  onToggleSubtask,
}: {
  task: Task;
  onOpen: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    transition: "transform 200ms ease, opacity 200ms ease",
  };

  const progressDone = task.subtasks.filter((subtask) => subtask.done).length;

  return (
    <button
      ref={setNodeRef}
      style={style}
      className="animate-fade-in w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-all duration-200 hover:bg-slate-50"
      type="button"
      onClick={() => onOpen(task.id)}
      {...listeners}
      {...attributes}
    >
      <div className="grid grid-cols-12 items-center gap-2">
        <span className="col-span-4 truncate font-medium text-slate-800">{task.title}</span>
        <span className="col-span-2 text-xs text-slate-600">{task.assignee}</span>
        <span className="col-span-2 text-xs text-slate-600">{dueLabel(task)}</span>
        <span className="col-span-2 text-xs text-slate-600">{progressDone}/{task.subtasks.length}</span>
        <span className="col-span-2 flex items-center justify-end gap-1">
          <span className={`h-2.5 w-2.5 rounded-full ${COLOR_TAG_STYLES[task.colorTag]}`} />
          {isOverdue(task) ? <span className="text-xs font-semibold text-rose-600">Overdue</span> : null}
        </span>
      </div>
      {task.subtasks[0] ? (
        <label className="mt-1 flex items-center gap-2 text-xs text-slate-500" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={task.subtasks[0].done} onChange={() => onToggleSubtask(task.id, task.subtasks[0].id)} />
          <span className={task.subtasks[0].done ? "line-through" : ""}>{task.subtasks[0].text}</span>
        </label>
      ) : null}
    </button>
  );
}

function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onAddComment,
}: {
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, updates: TaskFormState) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onAddComment: (taskId: string, text: string) => void;
}) {
  const [form, setForm] = useState<TaskFormState>({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignee: task.assignee,
    colorTag: task.colorTag,
    dueDate: task.dueDate,
  });
  const [subtaskText, setSubtaskText] = useState("");
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assignee,
      colorTag: task.colorTag,
      dueDate: task.dueDate,
    });
    setSubtaskText("");
    setCommentText("");
  }, [task]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Task Details</h2>
          <button className="text-slate-500 hover:text-slate-700" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

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
          <div className="grid gap-3 sm:grid-cols-4">
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
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </div>
          {isOverdue(task) ? <p className="text-sm font-semibold text-rose-600">This task is overdue.</p> : null}
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
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
              Save
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Subtasks</h3>
          <div className="space-y-2">
            {task.subtasks.length === 0 ? <p className="text-sm text-slate-500">No subtasks yet.</p> : null}
            {task.subtasks.map((subtask) => (
              <label key={subtask.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={subtask.done} onChange={() => onToggleSubtask(task.id, subtask.id)} />
                <span className={subtask.done ? "line-through text-slate-500" : ""}>{subtask.text}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Add subtask"
              value={subtaskText}
              onChange={(event) => setSubtaskText(event.target.value)}
            />
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              onClick={() => {
                if (!subtaskText.trim()) return;
                onAddSubtask(task.id, subtaskText.trim());
                setSubtaskText("");
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Comments</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {task.comments.length === 0 ? <p className="text-sm text-slate-500">No comments yet.</p> : null}
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                <p className="text-slate-700">{comment.text}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Add comment"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
            />
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              onClick={() => {
                if (!commentText.trim()) return;
                onAddComment(task.id, commentText.trim());
                setCommentText("");
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([{ id: "default", name: "Default Board", tasks: [] }]);
  const [activeBoardId, setActiveBoardId] = useState("default");
  const [boardNameInput, setBoardNameInput] = useState("");
  const [renameBoardInput, setRenameBoardInput] = useState("");
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<ColorTag | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0] ?? { id: "default", name: "Default Board", tasks: [] },
    [boards, activeBoardId],
  );

  const selectedTask = useMemo(
    () => activeBoard.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [activeBoard.tasks, selectedTaskId],
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { boards?: Board[]; activeBoardId?: string };
        if (Array.isArray(parsed.boards) && parsed.boards.length > 0) {
          const sanitizedBoards = parsed.boards
            .map((board) => {
              if (!board || typeof board.id !== "string" || typeof board.name !== "string" || !Array.isArray(board.tasks)) {
                return null;
              }
              const tasks = board.tasks.filter(
                (task): task is Task =>
                  Boolean(task?.id) &&
                  typeof task.title === "string" &&
                  typeof task.description === "string" &&
                  isPriority(task.priority) &&
                  typeof task.assignee === "string" &&
                  isColorTag(task.colorTag) &&
                  isColumn(task.columnId) &&
                  typeof task.dueDate === "string" &&
                  Array.isArray(task.subtasks) &&
                  Array.isArray(task.comments),
              );

              return { ...board, tasks };
            })
            .filter((board): board is Board => Boolean(board));

          if (sanitizedBoards.length > 0) {
            setBoards(sanitizedBoards);
            if (parsed.activeBoardId && sanitizedBoards.some((board) => board.id === parsed.activeBoardId)) {
              setActiveBoardId(parsed.activeBoardId);
            } else {
              setActiveBoardId(sanitizedBoards[0].id);
            }
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setTasksLoaded(true);
  }, []);

  useEffect(() => {
    if (!tasksLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ boards, activeBoardId }));
  }, [boards, activeBoardId, tasksLoaded]);

  const updateActiveBoardTasks = (updater: (tasks: Task[]) => Task[]) => {
    setBoards((prev) => prev.map((board) => (board.id === activeBoard.id ? { ...board, tasks: updater(board.tasks) } : board)));
  };

  const visibleTasks = useMemo(
    () => (filterTag === "all" ? activeBoard.tasks : activeBoard.tasks.filter((task) => task.colorTag === filterTag)),
    [activeBoard.tasks, filterTag],
  );

  const tasksByColumn = useMemo(
    () =>
      COLUMNS.reduce<Record<ColumnId, Task[]>>(
        (acc, column) => {
          acc[column.id] = visibleTasks.filter((task) => task.columnId === column.id);
          return acc;
        },
        { todo: [], inProgress: [], done: [] },
      ),
    [visibleTasks],
  );

  const onAddTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.assignee.trim()) return;

    updateActiveBoardTasks((tasks) => [
      {
        id: createId(),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignee: form.assignee.trim(),
        colorTag: form.colorTag,
        dueDate: form.dueDate,
        columnId: "todo",
        subtasks: [],
        comments: [],
      },
      ...tasks,
    ]);

    setForm(DEFAULT_FORM);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const targetColumn = COLUMNS.some((column) => column.id === overId)
      ? (overId as ColumnId)
      : activeBoard.tasks.find((task) => task.id === overId)?.columnId;

    if (!targetColumn) return;

    updateActiveBoardTasks((tasks) => tasks.map((task) => (task.id === active.id ? { ...task, columnId: targetColumn } : task)));
  };

  const updateTask = (taskId: string, updates: TaskFormState) => {
    updateActiveBoardTasks((tasks) => tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const deleteTask = (taskId: string) => {
    updateActiveBoardTasks((tasks) => tasks.filter((task) => task.id !== taskId));
    setSelectedTaskId((prev) => (prev === taskId ? null : prev));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    updateActiveBoardTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
              ),
            }
          : task,
      ),
    );
  };

  const addSubtask = (taskId: string, text: string) => {
    updateActiveBoardTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: [...task.subtasks, { id: createId(), text, done: false }] }
          : task,
      ),
    );
  };

  const addComment = (taskId: string, text: string) => {
    updateActiveBoardTasks((tasks) =>
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, comments: [...task.comments, { id: createId(), text, createdAt: new Date().toISOString() }] }
          : task,
      ),
    );
  };

  const createBoard = () => {
    if (!boardNameInput.trim()) return;
    const newBoard: Board = { id: createId(), name: boardNameInput.trim(), tasks: [] };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setBoardNameInput("");
    setRenameBoardInput("");
  };

  const renameBoard = () => {
    if (!renameBoardInput.trim()) return;
    setBoards((prev) => prev.map((board) => (board.id === activeBoard.id ? { ...board, name: renameBoardInput.trim() } : board)));
    setRenameBoardInput("");
  };

  const deleteBoard = () => {
    if (boards.length === 1) return;
    const remaining = boards.filter((board) => board.id !== activeBoard.id);
    setBoards(remaining);
    setActiveBoardId(remaining[0].id);
    setSelectedTaskId(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
          <p className="mt-1 text-sm text-slate-600">
            Multiple boards, drag-and-drop tasks, due dates, subtasks, comments, filters, and compact list view.
          </p>

          <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={activeBoard.id}
              onChange={(event) => {
                setActiveBoardId(event.target.value);
                setRenameBoardInput("");
                setSelectedTaskId(null);
              }}
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="New board name"
              value={boardNameInput}
              onChange={(event) => setBoardNameInput(event.target.value)}
            />
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={createBoard}>
              Create Board
            </button>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Rename active board"
              value={renameBoardInput}
              onChange={(event) => setRenameBoardInput(event.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={renameBoard}>
                Rename
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={deleteBoard}
                disabled={boards.length === 1}
              >
                Delete
              </button>
            </div>
          </div>

          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={onAddTask}>
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
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add Task
            </button>
            <textarea
              className="sm:col-span-2 lg:col-span-6 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-700" htmlFor="tag-filter">
              Filter by label:
            </label>
            <select
              id="tag-filter"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={filterTag}
              onChange={(event) => setFilterTag(event.target.value as ColorTag | "all")}
            >
              <option value="all">All labels</option>
              <option value="slate">Slate</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>

            <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-sm ${viewMode === "card" ? "bg-slate-800 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("card")}
              >
                Card View
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-sm ${viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
            </div>
          </div>
        </header>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <section className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <Column key={column.id} id={column.id} label={column.label} count={tasksByColumn[column.id].length}>
                {tasksByColumn[column.id].length === 0 ? <p className="text-sm text-slate-500">No tasks</p> : null}
                {viewMode === "card"
                  ? tasksByColumn[column.id].map((task) => (
                      <TaskCard key={task.id} task={task} onOpen={setSelectedTaskId} onToggleSubtask={toggleSubtask} />
                    ))
                  : tasksByColumn[column.id].map((task) => (
                      <TaskListRow key={task.id} task={task} onOpen={setSelectedTaskId} onToggleSubtask={toggleSubtask} />
                    ))}
              </Column>
            ))}
          </section>
        </DndContext>
      </div>

      {selectedTask ? (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onSave={updateTask}
          onDelete={deleteTask}
          onToggleSubtask={toggleSubtask}
          onAddSubtask={addSubtask}
          onAddComment={addComment}
        />
      ) : null}
    </main>
  );
}
