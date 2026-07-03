"use client";

import { useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { EMPTY_DOC, type NoteDTO, type TiptapDoc } from "@/lib/note-shared";

// Nota Rich Text (módulo 2) ligada a um highlight. Uma nota por destaque no
// painel do leitor: carrega a existente ou cria na primeira digitação. Autosave.
export function HighlightNotes({ highlightId }: { highlightId: string }) {
  const [note, setNote] = useState<NoteDTO | null>(null);
  const [ready, setReady] = useState(false);

  const noteIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    noteIdRef.current = null;
    fetch(`/api/notes?highlightId=${highlightId}`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => {
        if (cancelled) return;
        const first: NoteDTO | undefined = d.notes?.[0];
        setNote(first ?? null);
        noteIdRef.current = first?.id ?? null;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [highlightId]);

  function persist(doc: TiptapDoc, text: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(doc, text), 700);
  }

  async function save(doc: TiptapDoc, text: string) {
    const id = noteIdRef.current;
    if (id) {
      await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc, contentText: text }),
      });
      return;
    }
    // Ainda não existe nota — só cria quando há conteúdo real.
    if (!text.trim() || creatingRef.current) return;
    creatingRef.current = true;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlightId, content: doc, contentText: text }),
    });
    creatingRef.current = false;
    if (res.ok) {
      const { note: created } = await res.json();
      noteIdRef.current = created.id;
      setNote(created);
    }
  }

  if (!ready) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--color-ink-soft)]">Nota</p>
        <div className="h-24 animate-pulse rounded-lg bg-[var(--color-line)]/40" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[var(--color-ink-soft)]">Nota</p>
      <RichTextEditor
        key={highlightId}
        initialContent={note?.content ?? EMPTY_DOC}
        onChange={persist}
      />
    </div>
  );
}
