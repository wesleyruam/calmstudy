"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ShelfOption {
  id: string;
  name: string;
}

// Ações rápidas no card: favoritar e gerenciar prateleiras. Overlay no hover.
export function CardActions({
  userBookId,
  initialFavorite,
  initialShelfIds,
  shelves,
}: {
  userBookId: string;
  initialFavorite: boolean;
  initialShelfIds: string[];
  shelves: ShelfOption[];
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [shelfIds, setShelfIds] = useState<string[]>(initialShelfIds);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    const next = !favorite;
    setFavorite(next); // otimista
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

  return (
    <>
      {/* favoritar — sempre visível se favorito, senão aparece no hover */}
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

      {/* menu de prateleiras */}
      {shelves.length > 0 && (
        <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen((o) => !o);
            }}
            aria-label="Prateleiras"
            className="grid size-7 place-items-center rounded-full bg-black/30 text-sm text-white/90 backdrop-blur-sm"
          >
            🗂
          </button>
          {menuOpen && (
            <div
              className="absolute bottom-9 right-0 z-10 w-48 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-calm)]"
              onClick={(e) => e.preventDefault()}
            >
              {shelves.map((shelf) => {
                const on = shelfIds.includes(shelf.id);
                return (
                  <button
                    key={shelf.id}
                    onClick={(e) => toggleShelf(e, shelf.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-line)]/50"
                  >
                    <span className="w-4 text-[var(--color-accent)]">{on ? "✓" : ""}</span>
                    <span className="flex-1 truncate">{shelf.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
