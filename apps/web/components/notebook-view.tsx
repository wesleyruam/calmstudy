"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HighlightItem } from "@/components/highlight-item";
import { SummariesSection } from "@/components/summaries-section";
import {
  CATEGORY_META,
  HIGHLIGHT_CATEGORIES,
  hexToRgba,
  type HighlightCategory,
} from "@/lib/highlight-shared";
import type { NotebookData, NotebookHighlight } from "@/lib/notebook";

export function NotebookView({ data }: { data: NotebookData }) {
  const [items, setItems] = useState<NotebookHighlight[]>(data.highlights);
  const [cats, setCats] = useState<Set<HighlightCategory>>(new Set());
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of items) m.set(h.category, (m.get(h.category) ?? 0) + 1);
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((h) => {
      if (cats.size && !cats.has(h.category)) return false;
      if (favOnly && !h.favorite) return false;
      if (q) {
        const hay = [
          h.text,
          h.observation ?? "",
          h.tags.join(" "),
          ...h.notes.map((n) => n.contentText ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, cats, query, favOnly]);

  function toggleCat(c: HighlightCategory) {
    setCats((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const { highlight } = await res.json();
    setItems((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...highlight, notes: h.notes } : h)),
    );
  }

  async function remove(id: string) {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* cabeçalho */}
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Biblioteca
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl leading-tight">{data.title}</h1>
            {data.author && (
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{data.author}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/livro/${data.userBookId}`}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40"
            >
              📊 Painel
            </Link>
            <Link
              href={`/read/${data.userBookId}`}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40"
            >
              Abrir leitor
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
          <Pill>{plural(data.counts.highlights, "destaque", "destaques")}</Pill>
          <Pill>{plural(data.counts.notes, "nota", "notas")}</Pill>
          <Pill>{plural(data.counts.tags, "tag", "tags")}</Pill>
          {data.counts.reviewPending > 0 && (
            <Pill accent>{data.counts.reviewPending} p/ revisar</Pill>
          )}
        </div>
      </header>

      {/* filtros */}
      <div className="mb-6 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no caderno…"
          className="w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {HIGHLIGHT_CATEGORIES.filter((c) => catCounts.get(c)).map((c) => {
            const m = CATEGORY_META[c];
            const on = cats.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-transparent text-[var(--color-ink)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
                ].join(" ")}
                style={on ? { background: hexToRgba(m.color, 0.25) } : undefined}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: m.color }}
                />
                {m.label}
                <span className="opacity-60">{catCounts.get(c)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={[
              "ml-auto rounded-full border px-2.5 py-1 text-xs transition-colors",
              favOnly
                ? "border-transparent bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
            ].join(" ")}
          >
            ★ Favoritos
          </button>
        </div>
      </div>

      {/* lista */}
      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-soft)]">
          {items.length === 0
            ? "Este caderno está vazio. Destaque trechos no leitor para começar."
            : "Nenhum destaque com esses filtros."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((h) => (
            <HighlightItem
              key={h.id}
              h={{ ...h, userBookId: data.userBookId }}
              onPatch={patch}
              onRemove={remove}
            />
          ))}
        </ul>
      )}

      <SummariesSection userBookId={data.userBookId} initial={data.summaries} />
    </div>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1",
        accent
          ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
          : "bg-[var(--color-line)]/50",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
