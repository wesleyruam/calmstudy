"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X, Plus, MessageSquare, CircleHelp, Highlighter, BookText, Link2, ArrowRight } from "lucide-react";
import { CATEGORY_META, highlightColor, type HighlightDTO } from "@/lib/highlight-shared";
import type { NoteDTO } from "@/lib/note-shared";
import type { PageLinkDTO } from "@/lib/page-link-shared";

export interface ReaderConcept {
  id: string;
  title: string;
  color: string;
}

export type PanelTab = "content" | "notes" | "questions" | "links";

// Painel de contexto da página (bancada de leitura, Fase A): mostra e cria
// destaques/anotações/perguntas ancorados ao livro + página atual.
export function ReaderPagePanel({
  page,
  numPages,
  highlights,
  notes,
  concepts,
  links,
  tab,
  onTab,
  onOpenHighlight,
  onCreateNote,
  onDeleteNote,
  onCreateLink,
  onDeleteLink,
  onJump,
  onClose,
}: {
  page: number;
  numPages: number;
  highlights: HighlightDTO[];
  notes: NoteDTO[];
  concepts: ReaderConcept[];
  links: PageLinkDTO[];
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onOpenHighlight: (h: HighlightDTO) => void;
  onCreateNote: (kind: "NOTE" | "QUESTION", text: string) => Promise<void>;
  onDeleteNote: (id: string) => void;
  onCreateLink: (toPage: number, label: string) => Promise<void>;
  onDeleteLink: (id: string) => void;
  onJump: (page: number) => void;
  onClose: () => void;
}) {
  const pageNotes = useMemo(() => notes.filter((n) => n.kind === "NOTE"), [notes]);
  const questions = useMemo(() => notes.filter((n) => n.kind === "QUESTION"), [notes]);

  const TABS: { key: PanelTab; label: string; count?: number }[] = [
    { key: "content", label: "Conteúdo" },
    { key: "notes", label: "Anotações", count: pageNotes.length },
    { key: "questions", label: "Perguntas", count: questions.length },
    { key: "links", label: "Links", count: links.length },
  ];

  return (
    <aside className="flex h-full w-96 max-w-[90vw] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-30 max-xl:shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="flex-1 text-sm font-medium">Página {page}</span>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* abas */}
      <div className="flex gap-1 border-b border-[var(--color-line)] px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTab(t.key)}
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

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {(tab === "content") && (
          <Section title="Destaques nesta página" icon={Highlighter}>
            {highlights.length === 0 ? (
              <Empty>Selecione um trecho na página para destacar.</Empty>
            ) : (
              highlights.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onOpenHighlight(h)}
                  className="block w-full rounded-xl border border-[var(--color-line)] p-2.5 text-left transition-colors hover:bg-[var(--color-line)]/30"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ background: highlightColor(h) }}
                    />
                    <span className="line-clamp-3 text-sm">{h.text}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-4">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: `${highlightColor(h)}22`, color: highlightColor(h) }}
                    >
                      {CATEGORY_META[h.category].label}
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-soft)]">{when(h.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </Section>
        )}

        {tab === "content" && (
          <Section title="Conceitos relacionados" icon={BookText}>
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

        {(tab === "content" || tab === "notes") && (
          <Section title="Anotações" icon={MessageSquare}>
            <NoteComposer kind="NOTE" placeholder="Escreva uma anotação sobre esta página…" onCreate={onCreateNote} />
            {pageNotes.length === 0 ? (
              <Empty>Nenhuma anotação nesta página ainda.</Empty>
            ) : (
              pageNotes.map((n) => <NoteRow key={n.id} note={n} onDelete={onDeleteNote} />)
            )}
          </Section>
        )}

        {(tab === "content" || tab === "questions") && (
          <Section title="Perguntas" icon={CircleHelp}>
            <NoteComposer kind="QUESTION" placeholder="O que ficou em aberto nesta página?" onCreate={onCreateNote} />
            {questions.length === 0 ? (
              <Empty>Nenhuma pergunta nesta página ainda.</Empty>
            ) : (
              questions.map((n) => <NoteRow key={n.id} note={n} onDelete={onDeleteNote} />)
            )}
          </Section>
        )}

        {(tab === "content" || tab === "links") && (
          <Section title="Links" icon={Link2}>
            <LinkComposer page={page} numPages={numPages} onCreate={onCreateLink} />
            {links.length === 0 ? (
              <Empty>Nenhum link partindo desta página ainda.</Empty>
            ) : (
              links.map((l) => (
                <div key={l.id} className="group flex items-center gap-2 rounded-xl border border-[var(--color-line)] p-2.5">
                  <button
                    onClick={() => onJump(l.toPage)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{l.label}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-line)]/50 px-2 py-0.5 text-[11px] text-[var(--color-ink-soft)] transition-colors group-hover:bg-[var(--color-accent-soft)] group-hover:text-[var(--color-ink)]">
                      <ArrowRight className="size-3" /> Pág. {l.toPage}
                    </span>
                  </button>
                  <button
                    onClick={() => onDeleteLink(l.id)}
                    className="shrink-0 text-[11px] text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    Excluir
                  </button>
                </div>
              ))
            )}
          </Section>
        )}
      </div>
    </aside>
  );
}

function LinkComposer({
  page,
  numPages,
  onCreate,
}: {
  page: number;
  numPages: number;
  onCreate: (toPage: number, label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const toPage = Number(target);
  const valid =
    label.trim().length > 0 &&
    Number.isInteger(toPage) &&
    toPage >= 1 &&
    (!numPages || toPage <= numPages) &&
    toPage !== page;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    await onCreate(toPage, label.trim());
    setLabel("");
    setTarget("");
    setBusy(false);
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-line)] p-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Do que se trata? (ex.: Comandos de rede)"
        className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-soft)]"
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
          Ir para a página
          <input
            type="number"
            min={1}
            max={numPages || undefined}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Nº"
            className="w-16 rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1 tabular-nums text-[var(--color-ink)] outline-none [appearance:textfield] focus:border-[var(--color-accent)] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Vincular
        </button>
      </div>
    </div>
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
        <span className="text-[11px] text-[var(--color-ink-soft)]">{when(note.createdAt)}</span>
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
