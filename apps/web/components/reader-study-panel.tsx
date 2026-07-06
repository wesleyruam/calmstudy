"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, Plus, MessageSquare, CircleHelp, BookText } from "lucide-react";
import type { NoteDTO } from "@/lib/note-shared";

export interface ReaderConcept {
  id: string;
  title: string;
  color: string;
}

type Tab = "notes" | "questions" | "concepts";

// Bancada leve dos leitores de texto refluível (MOBI/EPUB): anotações, perguntas
// e conceitos ligados ao LIVRO (não à página, que não é estável em texto que
// reflui). Encapsula o próprio fetch/criação via /api/notes para manter os
// leitores enxutos. `locationLabel` marca de leve de onde a nota partiu.
export function ReaderStudyPanel({
  userBookId,
  concepts,
  page,
  locationLabel,
  onClose,
}: {
  userBookId: string;
  concepts: ReaderConcept[];
  page?: number;
  locationLabel?: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [tab, setTab] = useState<Tab>("notes");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/notes?userBookId=${userBookId}`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => {
        if (!cancelled) setNotes(d.notes ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  const createNote = useCallback(
    async (kind: "NOTE" | "QUESTION", text: string) => {
      const content = {
        type: "doc",
        content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
      };
      const res = await fetch(`/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userBookId,
          ...(page ? { page } : {}),
          kind,
          content,
          contentText: text,
        }),
      });
      if (!res.ok) return;
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
    },
    [userBookId, page],
  );

  const deleteNote = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const bookNotes = useMemo(() => notes.filter((n) => !n.highlightId && !n.isFreePage), [notes]);
  const pageNotes = useMemo(() => bookNotes.filter((n) => n.kind === "NOTE"), [bookNotes]);
  const questions = useMemo(() => bookNotes.filter((n) => n.kind === "QUESTION"), [bookNotes]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "notes", label: "Anotações", count: pageNotes.length },
    { key: "questions", label: "Perguntas", count: questions.length },
    { key: "concepts", label: "Conceitos", count: concepts.length },
  ];

  return (
    <aside className="flex h-full w-96 max-w-[90vw] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-30 max-xl:shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="flex-1 text-sm font-medium">Bancada de estudo</span>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-line)] px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "rounded-full px-2.5 py-1 text-xs transition-colors",
              tab === t.key
                ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
            ].join(" ")}
          >
            {t.label}
            {t.count ? <span className="ml-1 opacity-60">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {tab === "notes" && (
          <>
            <NoteComposer
              kind="NOTE"
              placeholder={locationLabel ? `Anotação (${locationLabel})…` : "Escreva uma anotação sobre o livro…"}
              onCreate={createNote}
            />
            {pageNotes.length === 0 ? (
              <Empty>Nenhuma anotação ainda.</Empty>
            ) : (
              pageNotes.map((n) => <NoteRow key={n.id} note={n} onDelete={deleteNote} />)
            )}
          </>
        )}

        {tab === "questions" && (
          <>
            <NoteComposer
              kind="QUESTION"
              placeholder={locationLabel ? `O que ficou em aberto (${locationLabel})?` : "O que ficou em aberto?"}
              onCreate={createNote}
            />
            {questions.length === 0 ? (
              <Empty>Nenhuma pergunta ainda.</Empty>
            ) : (
              questions.map((n) => <NoteRow key={n.id} note={n} onDelete={deleteNote} />)
            )}
          </>
        )}

        {tab === "concepts" && (
          <Section title="Conceitos deste livro" icon={BookText}>
            {concepts.length === 0 ? (
              <Empty>Nenhum conceito vinculado a este livro ainda.</Empty>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {concepts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/conceito/${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-line)]/40"
                  >
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    {c.title}
                  </Link>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function NoteRow({ note, onDelete }: { note: NoteDTO; onDelete: (id: string) => void }) {
  return (
    <div className="group rounded-xl border border-[var(--color-line)] p-2.5">
      <p className="whitespace-pre-wrap text-sm">{note.contentText || "(vazio)"}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-soft)]">
          {note.kind === "QUESTION" ? <CircleHelp className="size-3" /> : <MessageSquare className="size-3" />}
          {when(note.createdAt)}
        </span>
        <button
          onClick={() => onDelete(note.id)}
          className="text-[11px] text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

function NoteComposer({
  kind,
  placeholder,
  onCreate,
}: {
  kind: "NOTE" | "QUESTION";
  placeholder: string;
  onCreate: (kind: "NOTE" | "QUESTION", text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    await onCreate(kind, t);
    setText("");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--color-line)] p-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        rows={2}
        placeholder={placeholder}
        className="max-h-80 min-h-[3.5rem] w-full resize-y bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-soft)]"
      />
      <div className="mt-1 flex justify-end">
        <button
          onClick={submit}
          disabled={!text.trim() || busy}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Adicionar
        </button>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[var(--color-ink-soft)]">{children}</p>;
}

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoje, ${time}` : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
