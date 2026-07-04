"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { HighlightItem } from "@/components/highlight-item";
import {
  CATEGORY_META,
  HIGHLIGHT_CATEGORIES,
  hexToRgba,
  type HighlightCategory,
} from "@/lib/highlight-shared";
import type { ReviewData, ReviewHighlight } from "@/lib/review";

type Preset = "all" | "notes" | "questions" | "review" | "favorites";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "notes", label: "Com nota" },
  { key: "questions", label: "Dúvidas" },
  { key: "review", label: "Para revisar" },
  { key: "favorites", label: "Favoritos" },
];

export function ReviewView({ data }: { data: ReviewData }) {
  const [items, setItems] = useState<ReviewHighlight[]>(data.highlights);
  const [preset, setPreset] = useState<Preset>("all");
  const [cats, setCats] = useState<Set<HighlightCategory>>(new Set());
  const [book, setBook] = useState("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of items) m.set(h.category, (m.get(h.category) ?? 0) + 1);
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((h) => {
      if (preset === "notes" && h.notes.length === 0) return false;
      if (preset === "questions" && h.category !== "QUESTION") return false;
      if (preset === "review" && h.reviewStatus !== "PENDING") return false;
      if (preset === "favorites" && !h.favorite) return false;
      if (cats.size && !cats.has(h.category)) return false;
      if (book && h.userBookId !== book) return false;
      if (tag && !h.tags.includes(tag)) return false;
      if (q) {
        const hay = [h.text, h.observation ?? "", h.bookTitle, h.tags.join(" "), ...h.notes.map((n) => n.contentText ?? "")]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, preset, cats, book, tag, query]);

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
    setItems((prev) => prev.map((h) => (h.id === id ? { ...h, ...highlight, notes: h.notes } : h)));
  }
  async function remove(id: string) {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="size-4" /> Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-2xl">Revisão</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
          Tudo que você produziu, sem abrir os livros.
        </p>
      </header>

      {/* presets */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={[
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              preset === p.key
                ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* filtros */}
      <div className="mb-6 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar em tudo…"
          className="w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={book}
            onChange={(e) => setBook(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-xs"
          >
            <option value="">Todos os livros</option>
            {data.books.map((b) => (
              <option key={b.userBookId} value={b.userBookId}>
                {b.title.length > 40 ? b.title.slice(0, 40) + "…" : b.title}
              </option>
            ))}
          </select>
          {data.tags.length > 0 && (
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-xs"
            >
              <option value="">Todas as tags</option>
              {data.tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
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
                <span className="size-2.5 rounded-full" style={{ background: m.color }} />
                {m.label}
                <span className="opacity-60">{catCounts.get(c)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-3 text-xs text-[var(--color-ink-soft)]">
        {filtered.length} {filtered.length === 1 ? "item" : "itens"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-soft)]">
          {items.length === 0
            ? "Nada por aqui ainda. Comece a destacar trechos nos seus livros."
            : "Nenhum item com esses filtros."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((h) => (
            <HighlightItem
              key={h.id}
              h={h}
              showBook
              onPatch={patch}
              onRemove={remove}
              onTagClick={setTag}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
