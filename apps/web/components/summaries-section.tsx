"use client";

import { useRef, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { NoteRender } from "@/components/note-render";
import type { SummaryDTO } from "@/lib/summary-shared";
import type { TiptapDoc } from "@/lib/note-shared";

// Template estruturado do módulo 9.
function templateDoc(): TiptapDoc {
  const h = (text: string) => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] });
  const p = () => ({ type: "paragraph" });
  return {
    type: "doc",
    content: [
      h("Resumo"),
      p(),
      h("Principais ideias"),
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
      h("O que aprendi"),
      p(),
      h("Próximos estudos"),
      p(),
    ],
  };
}

export function SummariesSection({
  userBookId,
  initial,
}: {
  userBookId: string;
  initial: SummaryDTO[];
}) {
  const [summaries, setSummaries] = useState<SummaryDTO[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  async function create() {
    const res = await fetch(`/api/userbooks/${userBookId}/summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: templateDoc() }),
    });
    if (!res.ok) return;
    const { summary } = await res.json();
    setSummaries((prev) => [...prev, summary]);
    setOpenId(summary.id);
  }

  function save(id: string, body: Record<string, unknown>) {
    const map = timers.current;
    const t = map.get(id);
    if (t) clearTimeout(t);
    map.set(
      id,
      setTimeout(() => {
        void fetch(`/api/summaries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }, 700),
    );
    // reflete chapter/title localmente para o cabeçalho
    if ("chapter" in body || "title" in body) {
      setSummaries((prev) => prev.map((s) => (s.id === id ? { ...s, ...body } : s)));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/summaries/${id}`, { method: "DELETE" });
    if (res.ok) setSummaries((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
          Resumos por capítulo
        </h2>
        <button
          onClick={create}
          className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]"
        >
          + Novo resumo
        </button>
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Resuma cada capítulo: principais ideias, o que aprendi, próximos estudos.
        </p>
      ) : (
        <ul className="space-y-3">
          {summaries.map((s) => {
            const open = openId === s.id;
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenId(open ? null : s.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-[var(--color-ink-soft)]">{open ? "▾" : "▸"}</span>
                    <span className="font-medium">
                      {s.title || s.chapter || "Resumo sem título"}
                    </span>
                    {s.chapter && s.title && (
                      <span className="text-xs text-[var(--color-ink-soft)]">· {s.chapter}</span>
                    )}
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60 hover:text-red-500"
                    title="Excluir"
                  >
                    🗑
                  </button>
                </div>

                {open ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        defaultValue={s.title ?? ""}
                        onChange={(e) => save(s.id, { title: e.target.value || null })}
                        placeholder="Título"
                        className="flex-1 rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                      />
                      <input
                        defaultValue={s.chapter ?? ""}
                        onChange={(e) => save(s.id, { chapter: e.target.value || null })}
                        placeholder="Capítulo"
                        className="w-32 rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <RichTextEditor
                      key={s.id}
                      initialContent={s.content}
                      onChange={(doc, text) => save(s.id, { content: doc, contentText: text })}
                    />
                  </div>
                ) : (
                  <div className="mt-1 pl-6">
                    <NoteRender content={s.content} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
