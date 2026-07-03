"use client";

import { useEffect, useState } from "react";
import { BOOKMARK_CATEGORIES, bookmarkMeta, type BookmarkDTO } from "@/lib/bookmark-shared";

// Marcadores inteligentes (módulo 12): marcar a página atual com uma categoria
// (Revisar, Aplicar, Dúvida…) e saltar entre marcadores.
export function BookmarksControl({
  userBookId,
  currentPage,
  onJump,
}: {
  userBookId: string;
  currentPage: number;
  onJump: (page: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkDTO[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/userbooks/${userBookId}/bookmarks`)
      .then((r) => (r.ok ? r.json() : { bookmarks: [] }))
      .then((d) => {
        if (!cancelled) setBookmarks(d.bookmarks ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  const onThisPage = bookmarks.some((b) => b.page === currentPage);

  async function add(category: string) {
    setAdding(false);
    const res = await fetch(`/api/userbooks/${userBookId}/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: currentPage, category }),
    });
    if (!res.ok) return;
    const { bookmark } = await res.json();
    setBookmarks((prev) => [...prev, bookmark].sort((a, b) => a.page - b.page));
  }

  async function remove(id: string) {
    const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    if (res.ok) setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
          onThisPage
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60",
        ].join(" ")}
        title="Marcadores"
      >
        🔖 {bookmarks.length > 0 && <span className="tabular-nums">{bookmarks.length}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-sm shadow-[var(--shadow-calm)]">
          <div className="flex items-center justify-between px-1.5 py-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Marcadores
            </span>
            <button
              onClick={() => setAdding((a) => !a)}
              className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]"
            >
              + pág. {currentPage}
            </button>
          </div>

          {adding && (
            <div className="mb-1 grid grid-cols-3 gap-1 border-b border-[var(--color-line)] p-1.5">
              {BOOKMARK_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => add(c.key)}
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-[var(--color-line)]/50"
                  title={c.label}
                >
                  <span>{c.emoji}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          <ul className="max-h-72 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <li className="px-1.5 py-3 text-center text-xs text-[var(--color-ink-soft)]">
                Nenhum marcador ainda.
              </li>
            ) : (
              bookmarks.map((b) => {
                const meta = bookmarkMeta(b.category);
                return (
                  <li key={b.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[var(--color-line)]/40">
                    <button
                      onClick={() => {
                        onJump(b.page);
                        setOpen(false);
                      }}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span>{meta?.emoji ?? "🔖"}</span>
                      <span className="flex-1 truncate text-[var(--color-ink)]">
                        {meta?.label ?? "Marcador"}
                      </span>
                      <span className="text-xs tabular-nums text-[var(--color-ink-soft)]">
                        pág. {b.page}
                      </span>
                    </button>
                    <button
                      onClick={() => remove(b.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
