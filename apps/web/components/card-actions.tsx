"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Notebook, ChartColumn, Pencil, Check, Trash2, Ellipsis } from "lucide-react";
import { useDialog } from "@/components/dialog-provider";

export interface ShelfOption {
  id: string;
  name: string;
}

export interface TagOption {
  id: string;
  name: string;
}

// Ações no card: favoritar (estrela) + menu ⋯ (renomear, prateleiras, tags, excluir).
export function CardActions({
  userBookId,
  bookId,
  title,
  initialFavorite,
  initialShelfIds,
  shelves,
  initialTags,
  tags,
}: {
  userBookId: string;
  bookId: string;
  title: string;
  initialFavorite: boolean;
  initialShelfIds: string[];
  shelves: ShelfOption[];
  initialTags: TagOption[];
  tags: TagOption[];
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [shelfIds, setShelfIds] = useState<string[]>(initialShelfIds);
  const [bookTags, setBookTags] = useState<TagOption[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Envia o conjunto desejado de tags (por nome) e reflete a resposta autoritativa.
  const applyTags = async (names: string[]) => {
    const prev = bookTags;
    try {
      const res = await fetch(`/api/userbooks/${userBookId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: names }),
      });
      if (!res.ok) throw new Error();
      const { tags: next } = await res.json();
      setBookTags(next);
      router.refresh();
    } catch {
      setBookTags(prev);
    }
  };

  const toggleTag = (e: React.MouseEvent, tag: TagOption) => {
    e.preventDefault();
    const on = bookTags.some((t) => t.id === tag.id);
    const names = on
      ? bookTags.filter((t) => t.id !== tag.id).map((t) => t.name)
      : [...bookTags.map((t) => t.name), tag.name];
    setBookTags((cur) => (on ? cur.filter((t) => t.id !== tag.id) : [...cur, tag]));
    void applyTags(names);
  };

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tagInput.trim().replace(/^#/, "").trim();
    setTagInput("");
    if (!name || bookTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    void applyTags([...bookTags.map((t) => t.name), name]);
  };

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
    const name = await dialog.prompt({
      title: "Renomear livro",
      label: "Novo título",
      defaultValue: title,
      confirmLabel: "Renomear",
    });
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
      await dialog.alert({ title: "Não foi possível renomear.", message: "Tente novamente." });
    }
  };

  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    const ok = await dialog.confirm({
      title: `Excluir "${title}"?`,
      message: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      await dialog.alert({ title: "Não foi possível excluir.", message: "Tente novamente." });
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
          <Star className="size-4" fill={favorite ? "currentColor" : "none"} />
        </span>
      </button>

      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          aria-label="Mais ações"
          className="grid size-7 place-items-center rounded-full bg-black/35 leading-none text-white/90 backdrop-blur-sm"
        >
          <Ellipsis className="size-4" />
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
              <Notebook className="size-4" /> Caderno
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                e.preventDefault();
                router.push(`/livro/${userBookId}`);
              }}
            >
              <ChartColumn className="size-4" /> Painel
            </MenuItem>
            <MenuItem onClick={rename}>
              <Pencil className="size-4" /> Renomear
            </MenuItem>

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
                      <span className="grid w-4 place-items-center text-[var(--color-accent)]">
                        {on ? <Check className="size-4" /> : null}
                      </span>
                      <span className="flex-1 truncate">{shelf.name}</span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Tags
            </div>
            {tags.map((tag) => {
              const on = bookTags.some((t) => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={(e) => toggleTag(e, tag)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-line)]/50"
                >
                  <span className="grid w-4 place-items-center text-[var(--color-accent)]">
                    {on ? <Check className="size-4" /> : null}
                  </span>
                  <span className="flex-1 truncate">#{tag.name}</span>
                </button>
              );
            })}
            <form onSubmit={addTag} className="px-1.5 py-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="+ nova tag"
                className="w-full rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
              />
            </form>

            <div className="my-1 border-t border-[var(--color-line)]" />
            <MenuItem onClick={remove} danger>
              <Trash2 className="size-4" /> Excluir
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
