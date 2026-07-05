"use client";

import Link from "next/link";
import {
  Highlighter,
  MessageSquare,
  CircleHelp,
  Link2,
  BookText,
  Notebook,
  type LucideIcon,
} from "lucide-react";
import { formatDuration } from "@/lib/dashboard-shared";
import type { PanelTab } from "@/components/reader-page-panel";

// Coluna esquerda da bancada de leitura (Fase A): ferramentas (atalhos p/ o
// painel da página) + visão geral do estudo neste livro.
export function ReaderRail({
  userBookId,
  page,
  numPages,
  totalSeconds,
  counts,
  activeTab,
  onTool,
}: {
  userBookId: string;
  page: number;
  numPages: number;
  totalSeconds: number;
  counts: { highlights: number; notes: number; questions: number; concepts: number };
  activeTab: PanelTab;
  onTool: (t: PanelTab) => void;
}) {
  const progress = numPages ? Math.round((page / numPages) * 100) : 0;

  const tools: { tab: PanelTab; icon: LucideIcon; label: string }[] = [
    { tab: "content", icon: Highlighter, label: "Destaques" },
    { tab: "notes", icon: MessageSquare, label: "Anotações" },
    { tab: "questions", icon: CircleHelp, label: "Perguntas" },
    { tab: "links", icon: Link2, label: "Links" },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-paper)] lg:flex">
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Ferramentas
          </p>
          <ul className="flex flex-col gap-0.5">
            {tools.map((t) => (
              <li key={t.tab}>
                <button
                  onClick={() => onTool(t.tab)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                    activeTab === t.tab
                      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
                  ].join(" ")}
                >
                  <t.icon className="size-4 shrink-0" />
                  {t.label}
                </button>
              </li>
            ))}
            <li>
              <Link
                href="/conhecimento"
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/50"
              >
                <BookText className="size-4 shrink-0" />
                Conceitos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
            Visão geral
          </p>
          <div className="px-1">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
              <span>Progresso da leitura</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="mt-3 space-y-0.5">
            <Stat label="Tempo de leitura" value={formatDuration(totalSeconds)} />
            <Stat label="Destaques" value={String(counts.highlights)} />
            <Stat label="Anotações" value={String(counts.notes)} />
            <Stat label="Perguntas" value={String(counts.questions)} />
            <Stat label="Conceitos" value={String(counts.concepts)} />
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] p-3">
        <Link
          href={`/caderno/${userBookId}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/40 hover:text-[var(--color-ink)]"
        >
          <Notebook className="size-4" /> Ver caderno deste livro
        </Link>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between px-1 py-1 text-sm">
      <span className="text-[var(--color-ink-soft)]">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
