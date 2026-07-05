"use client";

import { useCallback, useEffect, useState } from "react";
import { X, CircleHelp, MessageSquare, Quote, Send, Trash2, CornerDownRight } from "lucide-react";
import { KIND_LABEL, type ContributionDTO, type ContributionKind } from "@/lib/contribution-shared";

// Camada contextual (Fase 2): discussões/perguntas do espaço ancoradas na página.
export function SpaceDiscussionPanel({
  spaceId,
  spaceName,
  page,
  onClose,
}: {
  spaceId: string;
  spaceName: string;
  page: number;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ContributionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/spaces/${spaceId}/contributions?page=${page}`)
      .then((r) => (r.ok ? r.json() : { contributions: [] }))
      .then((d) => setItems(d.contributions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spaceId, page]);

  useEffect(() => load(), [load]);

  async function create(kind: ContributionKind, contentText: string, quotedText?: string, parentId?: string) {
    const res = await fetch(`/api/spaces/${spaceId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, page, contentText, quotedText, parentId }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/spaces/${spaceId}/contributions/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <aside className="flex h-full w-96 max-w-[90vw] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-30 max-xl:shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{spaceName}</p>
          <p className="text-[11px] text-[var(--color-ink-soft)]">Discussão · Página {page}</p>
        </div>
        <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="animate-pulse text-xs text-[var(--color-ink-soft)]">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-soft)]">
            Nenhuma discussão nesta página ainda. Selecione um trecho e faça a primeira pergunta.
          </p>
        ) : (
          items.map((c) => (
            <Thread key={c.id} c={c} onReply={(t) => create("ANSWER", t, undefined, c.id)} onDelete={remove} />
          ))
        )}
      </div>

      <div className="border-t border-[var(--color-line)] p-3">
        <Composer onCreate={(kind, text, quoted) => create(kind, text, quoted)} />
      </div>
    </aside>
  );
}

function Thread({
  c,
  onReply,
  onDelete,
}: {
  c: ContributionDTO;
  onReply: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--color-line)] p-3">
      <Body c={c} onDelete={onDelete} />
      {c.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-[var(--color-line)] pl-3">
          {c.replies.map((r) => (
            <Body key={r.id} c={r} onDelete={onDelete} small />
          ))}
        </div>
      )}
      {replying ? (
        <div className="mt-2">
          <ReplyBox onSubmit={(t) => { onReply(t); setReplying(false); }} onCancel={() => setReplying(false)} />
        </div>
      ) : (
        <button
          onClick={() => setReplying(true)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          <CornerDownRight className="size-3" /> Responder
        </button>
      )}
    </div>
  );
}

function Body({ c, onDelete, small }: { c: ContributionDTO; onDelete: (id: string) => void; small?: boolean }) {
  const Icon = c.kind === "QUESTION" ? CircleHelp : MessageSquare;
  return (
    <div className="group">
      {!small && (
        <div className="mb-1 flex items-center gap-1.5">
          <Icon className="size-3.5 text-[var(--color-accent)]" />
          <span className="text-[11px] font-medium text-[var(--color-accent)]">{KIND_LABEL[c.kind]}</span>
        </div>
      )}
      {c.quotedText && (
        <p className="mb-1.5 flex gap-1 border-l-2 border-[var(--color-accent)]/40 pl-2 text-[11px] italic text-[var(--color-ink-soft)]">
          <Quote className="size-3 shrink-0 opacity-60" />
          <span className="line-clamp-3">{c.quotedText}</span>
        </p>
      )}
      <p className="whitespace-pre-wrap text-sm">{c.contentText}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-ink-soft)]">
          {c.author.name || "Alguém"} · {when(c.createdAt)}
        </span>
        {c.canDelete && (
          <button
            onClick={() => onDelete(c.id)}
            className="text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            title="Excluir"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Composer({ onCreate }: { onCreate: (kind: ContributionKind, text: string, quoted?: string) => void }) {
  const [kind, setKind] = useState<ContributionKind>("QUESTION");
  const [text, setText] = useState("");
  const [quoted, setQuoted] = useState<string | null>(null);

  function captureSelection() {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setQuoted(sel);
  }

  function submit() {
    const t = text.trim();
    if (!t) return;
    onCreate(kind, t, quoted ?? undefined);
    setText("");
    setQuoted(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {(["QUESTION", "COMMENT"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={[
              "rounded-full px-2.5 py-1 text-xs transition-colors",
              kind === k ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
            ].join(" ")}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
        <button
          onMouseDown={(e) => { e.preventDefault(); captureSelection(); }}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50"
          title="Citar o trecho selecionado na página"
        >
          <Quote className="size-3.5" /> Citar trecho
        </button>
      </div>

      {quoted && (
        <div className="flex items-start gap-1 rounded-lg bg-[var(--color-line)]/40 px-2 py-1 text-[11px] italic text-[var(--color-ink-soft)]">
          <span className="line-clamp-2 flex-1">{quoted}</span>
          <button onClick={() => setQuoted(null)} className="shrink-0 hover:text-[var(--color-ink)]"><X className="size-3" /></button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
          rows={2}
          placeholder={kind === "QUESTION" ? "Faça uma pergunta sobre esta página…" : "Comente algo desta página…"}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm outline-none placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-accent)]"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

function ReplyBox({ onSubmit, onCancel }: { onSubmit: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (text.trim()) onSubmit(text.trim()); }
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
        rows={1}
        placeholder="Responder…"
        className="max-h-32 min-h-[2.25rem] flex-1 resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <button
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={!text.trim()}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white disabled:opacity-40"
      >
        <Send className="size-3.5" />
      </button>
    </div>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoje, ${time}` : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
