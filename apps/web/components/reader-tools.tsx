"use client";

import { useEffect, useState } from "react";
import { MousePointer2, MessageSquare, CircleHelp, Bookmark, Check } from "lucide-react";
import { CATEGORY_META, HIGHLIGHT_CATEGORIES, type HighlightCategory } from "@/lib/highlight-shared";

export type ReaderTool = "select" | HighlightCategory;

// Texto (preto/branco) que contrasta com a cor da caneta, p/ o número ficar legível.
function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1c1917" : "#ffffff";
}

// Barra flutuante de ferramentas na página (Fase B): seleção + canetas de
// destaque (cor = categoria, numeradas 1–9) + atalhos de anotação/pergunta/marcador.
// Atalhos de teclado: S = selecionar · 1–9 = canetas.
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

  // Atalhos de teclado — ignorados enquanto se digita em campos de texto.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "s" || e.key === "S") {
        onTool("select");
      } else if (e.key >= "1" && e.key <= "9") {
        const cat = HIGHLIGHT_CATEGORIES[Number(e.key) - 1];
        if (cat) onTool(cat);
      } else {
        return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTool]);

  const activeLabel = tool === "select" ? "Selecionar" : CATEGORY_META[tool].label;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-col items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-calm)]">
        <ToolBtn label="Selecionar (S)" active={tool === "select"} onClick={() => onTool("select")}>
          <MousePointer2 className="size-4" />
        </ToolBtn>

        <Divider />

        {HIGHLIGHT_CATEGORIES.map((c, i) => {
          const meta = CATEGORY_META[c];
          const on = tool === c;
          return (
            <button
              key={c}
              onClick={() => onTool(c)}
              title={`${meta.label} (${i + 1})`}
              aria-label={`Destacar: ${meta.label}, atalho ${i + 1}`}
              className={[
                "grid size-7 place-items-center rounded-full text-[10px] font-semibold tabular-nums transition-transform hover:scale-110",
                on ? "ring-2 ring-[var(--color-ink)] ring-offset-1 ring-offset-[var(--color-surface)]" : "",
              ].join(" ")}
              style={{ background: meta.color, color: contrastText(meta.color) }}
            >
              {i + 1}
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

      {/* rótulo da ferramenta ativa */}
      <span className="max-w-[5.5rem] truncate rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-center text-[10px] font-medium text-[var(--color-ink-soft)] shadow-[var(--shadow-calm)]">
        {activeLabel}
      </span>
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
