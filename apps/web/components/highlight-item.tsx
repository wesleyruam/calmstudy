"use client";

import Link from "next/link";
import { NoteRender } from "@/components/note-render";
import { CATEGORY_META, hexToRgba, highlightColor, type HighlightDTO } from "@/lib/highlight-shared";
import type { NoteDTO } from "@/lib/note-shared";

export interface StudyHighlight extends HighlightDTO {
  notes: NoteDTO[];
  userBookId?: string;
  bookTitle?: string;
}

const REVIEW_LABEL: Record<string, string> = {
  NONE: "Marcar revisão",
  PENDING: "Revisar",
  REVIEWED: "Revisado",
  MASTERED: "Dominado",
};
const REVIEW_NEXT: Record<string, string> = {
  NONE: "PENDING",
  PENDING: "REVIEWED",
  REVIEWED: "MASTERED",
  MASTERED: "NONE",
};

// Card de destaque reutilizado no Caderno, Revisão, Favoritos e Linha do tempo.
export function HighlightItem({
  h,
  showBook,
  onPatch,
  onRemove,
  onTagClick,
}: {
  h: StudyHighlight;
  showBook?: boolean;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onTagClick?: (tag: string) => void;
}) {
  const color = highlightColor(h);
  const meta = CATEGORY_META[h.category];
  const ub = h.userBookId;

  return (
    <li
      className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
        <span>{meta.emoji}</span>
        <span className="font-medium text-[var(--color-ink)]">{meta.label}</span>
        {showBook && h.bookTitle && ub && (
          <Link href={`/caderno/${ub}`} className="truncate hover:text-[var(--color-ink)]">
            · {h.bookTitle}
          </Link>
        )}
        {h.page != null && ub && (
          <Link
            href={`/read/${ub}?page=${h.page}`}
            className="shrink-0 hover:text-[var(--color-ink)]"
          >
            {showBook ? `p.${h.page}` : `· pág. ${h.page}`}
          </Link>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => onPatch(h.id, { favorite: !h.favorite })}
            className="grid size-7 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
            title="Favoritar"
          >
            {h.favorite ? "★" : "☆"}
          </button>
          <button
            onClick={() => onPatch(h.id, { reviewStatus: REVIEW_NEXT[h.reviewStatus] })}
            className={[
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              h.reviewStatus === "NONE"
                ? "border-[var(--color-line)] hover:bg-[var(--color-line)]/40"
                : "border-transparent bg-[var(--color-accent-soft)] text-[var(--color-ink)]",
            ].join(" ")}
            title="Ciclar status de revisão"
          >
            {REVIEW_LABEL[h.reviewStatus]}
          </button>
          <button
            onClick={() => onRemove(h.id)}
            className="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60 hover:text-red-500"
            title="Excluir"
          >
            🗑
          </button>
        </div>
      </div>

      <blockquote
        className="pl-3 text-sm"
        style={{ borderLeft: `2px solid ${hexToRgba(color, 0.5)}` }}
      >
        {h.text}
      </blockquote>

      {h.observation && (
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{h.observation}</p>
      )}

      {h.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {h.tags.map((t) =>
            onTagClick ? (
              <button
                key={t}
                onClick={() => onTagClick(t)}
                className="rounded-full bg-[var(--color-line)]/60 px-2 py-0.5 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                #{t}
              </button>
            ) : (
              <span
                key={t}
                className="rounded-full bg-[var(--color-line)]/60 px-2 py-0.5 text-xs text-[var(--color-ink-soft)]"
              >
                #{t}
              </span>
            ),
          )}
        </div>
      )}

      {h.notes.map((n) => (
        <div
          key={n.id}
          className="mt-3 rounded-xl bg-[var(--color-paper)] p-1 ring-1 ring-[var(--color-line)]"
        >
          <NoteRender content={n.content} />
        </div>
      ))}
    </li>
  );
}
