"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDuration, type DashboardData, type GoalDTO, type TaskDTO } from "@/lib/dashboard-shared";

export function BookDashboard({ data }: { data: DashboardData }) {
  const [goals, setGoals] = useState<GoalDTO[]>(data.goals);
  const [tasks, setTasks] = useState<TaskDTO[]>(data.tasks);
  const [goalInput, setGoalInput] = useState("");
  const [taskInput, setTaskInput] = useState("");

  const maxSec = useMemo(
    () => Math.max(1, ...data.recentDays.map((d) => d.seconds)),
    [data.recentDays],
  );

  async function addGoal() {
    const t = goalInput.trim();
    if (!t) return;
    setGoalInput("");
    const res = await fetch(`/api/userbooks/${data.userBookId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    if (res.ok) {
      const { goal } = await res.json();
      setGoals((p) => [...p, goal]);
    }
  }
  async function toggleGoal(g: GoalDTO) {
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)));
    await fetch(`/api/goals/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !g.done }),
    });
  }
  async function removeGoal(id: string) {
    setGoals((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  async function addTask() {
    const t = taskInput.trim();
    if (!t) return;
    setTaskInput("");
    const res = await fetch(`/api/userbooks/${data.userBookId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks((p) => [...p, task]);
    }
  }
  async function toggleTask(t: TaskDTO) {
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
  }
  async function removeTask(id: string) {
    setTasks((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  const pct = Math.round(data.progress * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Biblioteca
        </Link>
        <div className="mt-3 flex items-start gap-4">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--color-line)]">
            {data.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl leading-tight">{data.title}</h1>
            {data.author && (
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{data.author}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs tabular-nums text-[var(--color-ink-soft)]">{pct}%</span>
            </div>
            <div className="mt-3 flex gap-2 text-sm">
              <Link
                href={`/read/${data.userBookId}`}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 transition-colors hover:bg-[var(--color-line)]/40"
              >
                Abrir leitor
              </Link>
              <Link
                href={`/caderno/${data.userBookId}`}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 transition-colors hover:bg-[var(--color-line)]/40"
              >
                📓 Caderno
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* estatísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tempo estudado" value={formatDuration(data.totalSeconds)} />
        <Stat label="Sessões" value={String(data.sessionsCount)} />
        <Stat label="Página" value={`${data.lastPage}${data.pages ? `/${data.pages}` : ""}`} />
        <Stat label="Destaques" value={String(data.counts.highlights)} />
        <Stat label="Notas" value={String(data.counts.notes)} />
        <Stat label="Resumos" value={String(data.counts.summaries)} />
        <Stat label="Conceitos" value={String(data.counts.concepts)} />
        <Stat label="Revisar" value={String(data.counts.reviewPending)} accent={data.counts.reviewPending > 0} />
      </div>

      {/* gráfico de sessões (14 dias) */}
      <section className="mt-8">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
          Últimos 14 dias
        </h2>
        <div className="flex h-24 items-end gap-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
          {data.recentDays.map((d) => (
            <div key={d.day} className="group relative flex-1" title={`${d.day}: ${formatDuration(d.seconds)}`}>
              <div
                className="w-full rounded-sm bg-[var(--color-accent)] transition-all"
                style={{ height: `${Math.max(2, (d.seconds / maxSec) * 72)}px`, opacity: d.seconds ? 1 : 0.25 }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* metas + checklist */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Objetivos
          </h2>
          <List
            items={goals}
            input={goalInput}
            setInput={setGoalInput}
            onAdd={addGoal}
            onToggle={(g) => toggleGoal(g as GoalDTO)}
            onRemove={removeGoal}
            placeholder="ex.: Ler 20 páginas por dia"
          />
        </section>
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Checklist
          </h2>
          <List
            items={tasks}
            input={taskInput}
            setInput={setTaskInput}
            onAdd={addTask}
            onToggle={(t) => toggleTask(t as TaskDTO)}
            onRemove={removeTask}
            placeholder="ex.: Resolver exercícios"
          />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
      <p className={["mt-0.5 text-lg font-medium tabular-nums", accent ? "text-[var(--color-accent)]" : ""].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function List({
  items,
  input,
  setInput,
  onAdd,
  onToggle,
  onRemove,
  placeholder,
}: {
  items: { id: string; title: string; done: boolean }[];
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  onToggle: (item: { id: string; title: string; done: boolean }) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
      <ul className="mb-1">
        {items.map((it) => (
          <li key={it.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-line)]/40">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => onToggle(it)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <span className={["flex-1 text-sm", it.done ? "text-[var(--color-ink-soft)] line-through" : ""].join(" ")}>
              {it.title}
            </span>
            <button
              onClick={() => onRemove(it.id)}
              className="text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5 px-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={onAdd}
          className="rounded-lg bg-[var(--color-accent-soft)] px-3 text-sm font-medium text-[var(--color-ink)]"
        >
          +
        </button>
      </div>
    </div>
  );
}
