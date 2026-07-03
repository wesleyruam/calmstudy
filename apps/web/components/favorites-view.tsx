"use client";

import { useState } from "react";
import Link from "next/link";
import { HighlightItem, type StudyHighlight } from "@/components/highlight-item";
import type { FavoritesData } from "@/lib/favorites";

export function FavoritesView({ data }: { data: FavoritesData }) {
  const [items, setItems] = useState<StudyHighlight[]>(data.highlights);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const { highlight } = await res.json();
    // desfavoritar remove da lista de favoritos
    if (highlight.favorite === false) {
      setItems((prev) => prev.filter((h) => h.id !== id));
    } else {
      setItems((prev) => prev.map((h) => (h.id === id ? { ...h, ...highlight, notes: h.notes } : h)));
    }
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
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-2xl">Favoritos</h1>
      </header>

      {data.books.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Livros
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.books.map((b) => (
              <Link
                key={b.userBookId}
                href={`/read/${b.userBookId}`}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 transition-colors hover:bg-[var(--color-line)]/30"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-line)]">
                  {b.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  {b.author && (
                    <p className="truncate text-xs text-[var(--color-ink-soft)]">{b.author}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
          Destaques
        </h2>
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--color-ink-soft)]">
            Nenhum destaque favoritado ainda.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((h) => (
              <HighlightItem key={h.id} h={h} showBook onPatch={patch} onRemove={remove} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
