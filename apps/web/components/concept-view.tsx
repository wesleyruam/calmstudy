"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/rich-text-editor";
import { HighlightItem } from "@/components/highlight-item";
import type { ConceptDetail } from "@/lib/concept-shared";
import type { TiptapDoc } from "@/lib/note-shared";

export function ConceptView({
  concept: initial,
  allConcepts,
  allBooks,
}: {
  concept: ConceptDetail;
  allConcepts: { id: string; title: string }[];
  allBooks: { userBookId: string; title: string }[];
}) {
  const router = useRouter();
  const [c, setC] = useState<ConceptDetail>(initial);
  const [linkInput, setLinkInput] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/concepts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setC((await res.json()).concept);
  }

  function saveContent(doc: TiptapDoc, text: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch(`/api/concepts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc, contentText: text }),
      });
    }, 700);
  }

  async function addLink() {
    const t = linkInput.trim();
    if (!t) return;
    setLinkInput("");
    const res = await fetch(`/api/concepts/${c.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toTitle: t }),
    });
    if (res.ok) setC((await res.json()).concept);
  }
  async function removeLink(linkId: string) {
    const res = await fetch(`/api/concept-links/${linkId}`, { method: "DELETE" });
    if (res.ok) setC((prev) => ({ ...prev, links: prev.links.filter((l) => l.linkId !== linkId) }));
  }
  async function toggleBook(userBookId: string, action: "add" | "remove") {
    const res = await fetch(`/api/concepts/${c.id}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userBookId, action }),
    });
    if (res.ok) setC((await res.json()).concept);
  }
  async function removeConcept() {
    if (!window.confirm(`Excluir o conceito "${c.title}"?`)) return;
    const res = await fetch(`/api/concepts/${c.id}`, { method: "DELETE" });
    if (res.ok) router.push("/conhecimento");
  }

  const relatedIds = new Set(c.books.map((b) => b.userBookId));
  const addableBooks = allBooks.filter((b) => !relatedIds.has(b.userBookId));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/conhecimento"
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Conhecimento
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => patch({ favorite: !c.favorite })}
            className="grid size-8 place-items-center rounded-full text-lg hover:bg-[var(--color-line)]/60"
            title="Favoritar"
          >
            {c.favorite ? "★" : "☆"}
          </button>
          <button
            onClick={removeConcept}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60 hover:text-red-500"
            title="Excluir"
          >
            🗑
          </button>
        </div>
      </div>

      {/* título + descrição editáveis */}
      <input
        defaultValue={c.title}
        onBlur={(e) => e.target.value.trim() && e.target.value !== c.title && patch({ title: e.target.value.trim() })}
        className="w-full bg-transparent font-serif text-3xl outline-none"
      />
      <textarea
        defaultValue={c.description ?? ""}
        onBlur={(e) => patch({ description: e.target.value || null })}
        placeholder="Definição curta…"
        rows={2}
        className="mt-2 w-full resize-none bg-transparent text-sm text-[var(--color-ink-soft)] outline-none"
      />

      {/* corpo Rich Text */}
      <div className="mt-4">
        <RichTextEditor key={c.id} initialContent={c.content} onChange={saveContent} />
      </div>

      {/* conceitos relacionados (wiki) */}
      <Section title="Relaciona-se com">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {c.links.map((l) => (
            <span
              key={l.linkId}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-sm"
            >
              <Link href={`/conceito/${l.conceptId}`} className="hover:text-[var(--color-accent)]">
                {l.title}
              </Link>
              <button
                onClick={() => removeLink(l.linkId)}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                aria-label="Remover link"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLink()}
          list="concept-suggestions"
          placeholder="ligar a outro conceito (cria se não existir)…"
          className="w-full rounded-lg border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <datalist id="concept-suggestions">
          {allConcepts.filter((x) => x.id !== c.id).map((x) => (
            <option key={x.id} value={x.title} />
          ))}
        </datalist>
      </Section>

      {/* livros relacionados */}
      <Section title="Livros relacionados">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {c.books.map((b) => (
            <span
              key={b.userBookId}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-line)]/50 px-2.5 py-1 text-sm"
            >
              <Link href={`/caderno/${b.userBookId}`} className="hover:text-[var(--color-accent)]">
                {b.title.length > 40 ? b.title.slice(0, 40) + "…" : b.title}
              </Link>
              <button
                onClick={() => toggleBook(b.userBookId, "remove")}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                aria-label="Remover livro"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {addableBooks.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && toggleBook(e.target.value, "add")}
            className="rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-xs"
          >
            <option value="">+ relacionar livro…</option>
            {addableBooks.map((b) => (
              <option key={b.userBookId} value={b.userBookId}>
                {b.title.length > 50 ? b.title.slice(0, 50) + "…" : b.title}
              </option>
            ))}
          </select>
        )}
      </Section>

      {/* evidências (destaques) */}
      {c.highlights.length > 0 && (
        <Section title="Evidências">
          <ul className="space-y-4">
            {c.highlights.map((h) => (
              <HighlightItem
                key={h.id}
                h={h}
                showBook
                onPatch={() => {}}
                onRemove={() => {}}
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
