"use client";

import { useState } from "react";
import { MousePointer2, MessageSquare, CircleHelp, Bookmark, Check } from "lucide-react";
import { CATEGORY_META, HIGHLIGHT_CATEGORIES, type HighlightCategory } from "@/lib/highlight-shared";

export type ReaderTool = "select" | HighlightCategory;

// Barra flutuante de ferramentas na página (Fase B): seleção + canetas de
// destaque (cor = categoria) + atalhos de anotação/pergunta/marcador.
export function ReaderTools({
  tool,
  onTool,
  onNote,
  onQuestion,
  onBookmark,
}: {
  tool: ReaderTool;
  onTool: (t: ReaderTool) => void;
  onNote: () => void;
  onQuestion: () => void;
  onBookmark: () => void | Promise<void>;
}) {
  const [marked, setMarked] = useState(false);

  async function bookmark() {
    await onBookmark();
    setMarked(true);
    setTimeout(() => setMarked(false), 1500);
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-calm)]">
      <ToolBtn label="Selecionar" active={tool === "select"} onClick={() => onTool("select")}>
        <MousePointer2 className="size-4" />
      </ToolBtn>

      <Divider />

      {HIGHLIGHT_CATEGORIES.map((c) => {
        const meta = CATEGORY_META[c];
        const on = tool === c;
        return (
          <button
            key={c}
            onClick={() => onTool(c)}
            title={`Destacar: ${meta.label}`}
            aria-label={`Destacar: ${meta.label}`}
            className={[
              "grid size-7 place-items-center rounded-full transition-transform hover:scale-110",
              on ? "ring-2 ring-[var(--color-ink)] ring-offset-1 ring-offset-[var(--color-surface)]" : "",
            ].join(" ")}
          >
            <span className="size-3.5 rounded-full" style={{ background: meta.color }} />
          </button>
        );
      })}

      <Divider />

      <ToolBtn label="Anotação" onClick={onNote}>
        <MessageSquare className="size-4" />
      </ToolBtn>
      <ToolBtn label="Pergunta" onClick={onQuestion}>
        <CircleHelp className="size-4" />
      </ToolBtn>
      <ToolBtn label="Marcar página" onClick={bookmark}>
        {marked ? <Check className="size-4 text-[var(--color-accent)]" /> : <Bookmark className="size-4" />}
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={[
        "grid size-8 place-items-center rounded-full transition-colors",
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
          : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="my-0.5 h-px w-5 bg-[var(--color-line)]" />;
}
