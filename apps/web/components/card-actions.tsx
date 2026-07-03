"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ShelfOption {
  id: string;
  name: string;
}

// Ações no card: favoritar (estrela) + menu ⋯ (renomear, prateleiras, excluir).
export function CardActions({
  userBookId,
  bookId,
  title,
  initialFavorite,
  initialShelfIds,
  shelves,
}: {
  userBookId: string;
  bookId: string;
  title: string;
  initialFavorite: boolean;
  initialShelfIds: string[];
  shelves: ShelfOption[];
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [shelfIds, setShelfIds] = useState<string[]>(initialShelfIds);
  const [menuOpen, setMenuOpen] = useState(false);

  const stop = (e: React.MouseEvent) => e.preventDefault();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    const next = !favorite;
    setFavorite(next);
    try {
      await fetch(`/api/userbooks/${userBookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
      router.refresh();
    } catch {
      setFavorite(!next);
    }
  };

  const toggleShelf = async (e: React.MouseEvent, shelfId: string) => {
    e.preventDefault();
    const inShelf = shelfIds.includes(shelfId);
    const action = inShelf ? "remove" : "add";
    setShelfIds((ids) => (inShelf ? ids.filter((i) => i !== shelfId) : [...ids, shelfId]));
    try {
      await fetch(`/api/shelves/${shelfId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBookId, action }),
      });
      router.refresh();
    } catch {
      setShelfIds((ids) => (inShelf ? [...ids, shelfId] : ids.filter((i) => i !== shelfId)));
    }
  };

  const rename = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    const name = window.prompt("Renomear livro", title);
    if (!name?.trim() || name.trim() === title) return;
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name.trim() }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Não foi possível renomear.");
    }
  };

  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (!window.confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Não foi possível excluir.");
    }
  };

  return (
    <>
      <button
        onClick={toggleFavorite}
        aria-label={favorite ? "Desfavoritar" : "Favoritar"}
        className={[
          "absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-black/30 text-sm backdrop-blur-sm transition-opacity",
          favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ].join(" ")}
      >
        <span className={favorite ? "text-amber-300" : "text-white/90"}>
          {favorite ? "★" : "☆"}
        </span>
      </button>

      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          aria-label="Mais ações"
          className="grid size-7 place-items-center rounded-full bg-black/35 text-sm leading-none text-white/90 backdrop-blur-sm"
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="absolute bottom-9 right-0 z-10 w-52 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 text-sm shadow-[var(--shadow-calm)]"
            onClick={stop}
          >
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                router.push(`/caderno/${userBookId}`);
              }}
            >
              📓 Caderno
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                router.push(`/livro/${userBookId}`);
              }}
            >
              📊 Painel
            </MenuItem>
            <MenuItem onClick={rename}>✏️ Renomear</MenuItem>

            {shelves.length > 0 && (
              <>
                <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                  Prateleiras
                </div>
                {shelves.map((shelf) => {
                  const on = shelfIds.includes(shelf.id);
                  return (
                    <button
                      key={shelf.id}
                      onClick={(e) => toggleShelf(e, shelf.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-line)]/50"
                    >
                      <span className="w-4 text-[var(--color-accent)]">{on ? "✓" : ""}</span>
                      <span className="flex-1 truncate">{shelf.name}</span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="my-1 border-t border-[var(--color-line)]" />
            <MenuItem onClick={remove} danger>
              🗑 Excluir
            </MenuItem>
          </div>
        )}
      </div>
    </>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-line)]/50",
        danger ? "text-red-500" : "text-[var(--color-ink)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
