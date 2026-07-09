"use client";

import { useState } from "react";
import { ReaderPagePanel, type PanelTab, type ReaderConcept } from "@/components/reader-page-panel";
import { HighlightPanel } from "@/components/highlight-panel";
import { HighlightNotes } from "@/components/highlight-notes";
import { CATEGORY_META, HIGHLIGHT_CATEGORIES } from "@/lib/highlight-shared";
import type { useReflowStudy } from "@/components/use-reflow-study";

type Study = ReturnType<typeof useReflowStudy>;

// Painel de contexto dos leitores refluíveis: reaproveita EXATAMENTE o painel do
// PDF (Conteúdo · Anotações · Perguntas · Links) e o painel de edição de destaque.
export function ReaderStudyDock({
  page,
  numPages,
  concepts,
  study,
  onJump,
  onClose,
}: {
  page: number;
  numPages: number;
  concepts: ReaderConcept[];
  study: Study;
  onJump: (page: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("content");
  const {
    highlights,
    notes,
    links,
    activeHighlight,
    setActiveHighlight,
    updateHighlight,
    deleteHighlight,
    createNote,
    deleteNote,
    createLink,
    deleteLink,
  } = study;

  if (activeHighlight) {
    return (
      <HighlightPanel
        key={activeHighlight.id}
        highlight={activeHighlight}
        onUpdate={updateHighlight}
        onDelete={deleteHighlight}
        onClose={() => setActiveHighlight(null)}
      >
        <HighlightNotes highlightId={activeHighlight.id} />
      </HighlightPanel>
    );
  }

  const pageHighlights = highlights.filter((h) => (h.page ?? h.anchor?.page) === page);
  const standaloneNotes = notes.filter((n) => !n.highlightId && !n.isFreePage);
  const pageNotes = standaloneNotes.filter((n) => n.page === page);
  const pageLinks = links.filter((l) => l.fromPage === page);

  return (
    <ReaderPagePanel
      page={page}
      numPages={numPages}
      highlights={pageHighlights}
      notes={pageNotes}
      concepts={concepts}
      links={pageLinks}
      tab={tab}
      onTab={setTab}
      onOpenHighlight={setActiveHighlight}
      onCreateNote={(kind, text) => createNote(kind, text, page)}
      onDeleteNote={deleteNote}
      onCreateLink={(toPage, label) => createLink(page, toPage, label)}
      onDeleteLink={deleteLink}
      onJump={onJump}
      onClose={onClose}
    />
  );
}

// Menu flutuante que aparece ao selecionar texto: escolhe a categoria do destaque.
export function HighlightMenu({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (category: (typeof HIGHLIGHT_CATEGORIES)[number]) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* clique fora fecha */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="fixed z-50 flex max-w-[min(92vw,360px)] flex-wrap gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-2xl"
        style={{ left: x, top: y, transform: "translate(-50%, -115%)" }}
        onMouseDown={(e) => e.preventDefault()} // não perde a seleção ao clicar
      >
        {HIGHLIGHT_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => onPick(cat)}
              title={meta.label}
              aria-label={`Destacar como ${meta.label}`}
              className="size-6 rounded-full border border-black/10 transition-transform hover:scale-110"
              style={{ background: meta.color }}
            />
          );
        })}
      </div>
    </>
  );
}
