"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KnowledgeData } from "@/lib/knowledge";
import type { ConceptListItem } from "@/lib/concept-shared";

export function KnowledgeView({ data }: { data: KnowledgeData }) {
  const router = useRouter();
  const concepts: ConceptListItem[] = data.concepts;
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [concepts, query]);

  async function createConcept() {
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    const res = await fetch("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    setCreating(false);
    if (res.ok) {
      const { concept } = await res.json();
      router.push(`/conceito/${concept.id}`);
    }
  }

  async function createFreePage() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFreePage: true, title: "Nova página", content: { type: "doc", content: [] } }),
    });
    if (res.ok) {
      const { note } = await res.json();
      router.push(`/pagina/${note.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
          >
            ← Biblioteca
          </Link>
          <h1 className="mt-3 font-serif text-2xl">Conhecimento</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
            Sua segunda memória: conceitos, conexões e páginas livres.
          </p>
        </div>
        <Link
          href="/mapa"
          className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40"
        >
          🕸 Mapa
        </Link>
      </header>

      {/* criar conceito */}
      <div className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createConcept()}
          placeholder="Novo conceito (ex.: TCP, Fotossíntese…)"
          className="flex-1 rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={createConcept}
          disabled={!title.trim() || creating}
          className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          Criar
        </button>
      </div>

      {concepts.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conceitos…"
          className="mb-4 w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      )}

      {/* conceitos */}
      {filtered.length === 0 ? (
        <p className="my-10 text-center text-sm text-[var(--color-ink-soft)]">
          {concepts.length === 0
            ? "Nenhum conceito ainda. Crie o primeiro acima."
            : "Nenhum conceito com esse termo."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/conceito/${c.id}`}
                className="flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)]"
                style={c.color ? { borderLeft: `3px solid ${c.color}` } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.title}</span>
                  {c.favorite && <span className="text-xs text-amber-400">★</span>}
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-soft)]">
                    {c.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-soft)]">
                  {c.counts.links > 0 && <Chip>🔗 {c.counts.links}</Chip>}
                  {c.counts.books > 0 && <Chip>📚 {c.counts.books}</Chip>}
                  {c.counts.highlights > 0 && <Chip>✦ {c.counts.highlights}</Chip>}
                  {c.counts.notes > 0 && <Chip>📝 {c.counts.notes}</Chip>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* páginas livres (módulo 5) */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Páginas livres
          </h2>
          <button
            onClick={createFreePage}
            className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]"
          >
            + Nova página
          </button>
        </div>
        {data.freePages.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">
            Páginas soltas para resumos, planejamento ou anotações gerais.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
            {data.freePages.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pagina/${p.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-[var(--color-line)]/30"
                >
                  📄 {p.title || "Sem título"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--color-line)]/50 px-2 py-0.5">{children}</span>;
}
