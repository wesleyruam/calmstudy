"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

// Criar espaço a partir de um livro do usuário.
export function CreateSpace({ books }: { books: { bookId: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bookId, setBookId] = useState(books[0]?.bookId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim() || !bookId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, bookId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Não foi possível criar o espaço.");
      setBusy(false);
      return;
    }
    const { id } = await res.json();
    router.push(`/espaco/${id}`);
  }

  if (books.length === 0) {
    return (
      <p className="max-w-xs text-right text-xs text-[var(--color-ink-soft)]">
        Importe um livro para criar um espaço.
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" /> Criar espaço
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-calm)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg">Novo espaço de estudo</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60">
                <X className="size-4" />
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: TryHackMe Team"
                autoFocus
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">Livro</span>
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              >
                {books.map((b) => (
                  <option key={b.bookId} value={b.bookId}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">Descrição (opcional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Do que se trata este espaço?"
                className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Criar espaço
            </button>
          </form>
        </div>
      )}
    </>
  );
}
