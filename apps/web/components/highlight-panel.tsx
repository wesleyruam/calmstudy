"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import {
  CATEGORY_META,
  HIGHLIGHT_CATEGORIES,
  highlightColor,
  type HighlightDTO,
  type Priority,
  type ReviewStatus,
} from "@/lib/highlight-shared";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Baixa" },
  { value: "MED", label: "Média" },
  { value: "HIGH", label: "Alta" },
];

const REVIEW: { value: ReviewStatus; label: string }[] = [
  { value: "NONE", label: "—" },
  { value: "PENDING", label: "Revisar" },
  { value: "REVIEWED", label: "Revisado" },
  { value: "MASTERED", label: "Dominado" },
];

export function HighlightPanel({
  highlight,
  onUpdate,
  onDelete,
  onClose,
  children,
}: {
  highlight: HighlightDTO;
  onUpdate: (h: HighlightDTO) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  children?: React.ReactNode; // área da nota Rich Text (TipTap)
}) {
  const [observation, setObservation] = useState(highlight.observation ?? "");
  const [tagInput, setTagInput] = useState("");
  const obsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza quando troca de highlight selecionado.
  useEffect(() => {
    setObservation(highlight.observation ?? "");
    setTagInput("");
  }, [highlight.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/highlights/${highlight.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { highlight: updated } = await res.json();
      onUpdate(updated);
    }
  }

  function saveObservation(value: string) {
    setObservation(value);
    if (obsTimer.current) clearTimeout(obsTimer.current);
    obsTimer.current = setTimeout(() => {
      void patch({ observation: value || null });
    }, 600);
  }

  function addTag(raw: string) {
    const name = raw.trim().replace(/^#/, "");
    if (!name) return;
    if (highlight.tags.includes(name)) {
      setTagInput("");
      return;
    }
    void patch({ tags: [...highlight.tags, name] });
    setTagInput("");
  }

  function removeTag(name: string) {
    void patch({ tags: highlight.tags.filter((t) => t !== name) });
  }

  async function remove() {
    const res = await fetch(`/api/highlights/${highlight.id}`, { method: "DELETE" });
    if (res.ok) onDelete(highlight.id);
  }

  const meta = CATEGORY_META[highlight.category];

  return (
    <aside className="flex h-full w-96 max-w-[90vw] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-30 max-xl:shadow-2xl">
      {/* cabeçalho */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ background: highlightColor(highlight) }}
        />
        <span className="flex-1 text-sm font-medium">{meta.label}</span>
        <button
          onClick={() => void patch({ favorite: !highlight.favorite })}
          className={[
            "grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60",
            highlight.favorite ? "text-amber-400" : "",
          ].join(" ")}
          title="Favoritar"
          aria-label="Favoritar"
        >
          <Star className="size-4" fill={highlight.favorite ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* trecho destacado */}
        <blockquote
          className="border-l-2 pl-3 text-sm italic text-[var(--color-ink-soft)]"
          style={{ borderColor: highlightColor(highlight) }}
        >
          {highlight.text}
        </blockquote>

        {/* categoria */}
        <Field label="Categoria">
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHT_CATEGORIES.map((c) => {
              const m = CATEGORY_META[c];
              const on = c === highlight.category;
              return (
                <button
                  key={c}
                  onClick={() => void patch({ category: c })}
                  title={m.label}
                  className={[
                    "grid size-7 place-items-center rounded-full text-xs transition-transform hover:scale-110",
                    on ? "ring-2 ring-[var(--color-ink)] ring-offset-1 ring-offset-[var(--color-surface)]" : "",
                  ].join(" ")}
                  style={{ background: m.color }}
                >
                  <span className="sr-only">{m.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* prioridade + revisão */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioridade">
            <div className="flex overflow-hidden rounded-lg border border-[var(--color-line)] text-xs">
              <button
                onClick={() => void patch({ priority: null })}
                className={seg(!highlight.priority)}
              >
                —
              </button>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => void patch({ priority: p.value })}
                  className={seg(highlight.priority === p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Revisão">
            <select
              value={highlight.reviewStatus}
              onChange={(e) => void patch({ reviewStatus: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-xs"
            >
              {REVIEW.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* tags */}
        <Field label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {highlight.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-line)]/60 px-2 py-0.5 text-xs"
              >
                #{t}
                <button
                  onClick={() => removeTag(t)}
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  aria-label={`Remover ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            onBlur={() => tagInput && addTag(tagInput)}
            placeholder="adicionar tag…"
            className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-xs outline-none focus:border-[var(--color-accent)]"
          />
        </Field>

        {/* observação rápida */}
        <Field label="Observação">
          <textarea
            value={observation}
            onChange={(e) => saveObservation(e.target.value)}
            rows={2}
            placeholder="uma nota curta…"
            className="max-h-80 min-h-[3rem] w-full resize-y rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </Field>

        {/* nota Rich Text (TipTap) — injetada pelo leitor */}
        {children}
      </div>

      {/* rodapé */}
      <div className="border-t border-[var(--color-line)] p-3">
        <button
          onClick={remove}
          className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-ink-soft)] transition-colors hover:border-red-300 hover:text-red-500"
        >
          Excluir destaque
        </button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[var(--color-ink-soft)]">{label}</p>
      {children}
    </div>
  );
}

function seg(on: boolean) {
  return [
    "flex-1 px-2 py-1.5 transition-colors",
    on
      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/40",
  ].join(" ");
}
