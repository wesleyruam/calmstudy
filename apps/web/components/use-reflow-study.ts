"use client";

import { useCallback, useEffect, useState } from "react";
import type { HighlightDTO } from "@/lib/highlight-shared";
import type { NoteDTO } from "@/lib/note-shared";
import type { PageLinkDTO } from "@/lib/page-link-shared";
import type { TextAnchor } from "@/lib/reflow-highlight";

// Estado + CRUD da bancada de estudo dos leitores de texto refluível (MOBI/EPUB).
// Espelha o que o leitor de PDF faz inline, mas compartilhado pelos dois leitores.
export function useReflowStudy(userBookId: string) {
  const [highlights, setHighlights] = useState<HighlightDTO[]>([]);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [links, setLinks] = useState<PageLinkDTO[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<HighlightDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = <T,>(url: string, key: string, set: (v: T[]) => void) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d: Record<string, unknown>) => {
          if (!cancelled) set((d[key] ?? []) as T[]);
        })
        .catch(() => {});
    void load<HighlightDTO>(`/api/userbooks/${userBookId}/highlights`, "highlights", setHighlights);
    void load<NoteDTO>(`/api/notes?userBookId=${userBookId}`, "notes", setNotes);
    void load<PageLinkDTO>(`/api/userbooks/${userBookId}/links`, "links", setLinks);
    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  const createHighlight = useCallback(
    async (text: string, anchor: TextAnchor, category: HighlightDTO["category"]) => {
      const res = await fetch(`/api/userbooks/${userBookId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          anchor,
          page: anchor.page,
          category,
          ...(anchor.chap !== undefined ? { chapter: String(anchor.chap) } : {}),
        }),
      });
      if (!res.ok) return;
      const { highlight } = await res.json();
      setHighlights((prev) => [...prev, highlight]);
      setActiveHighlight(highlight);
    },
    [userBookId],
  );

  const updateHighlight = useCallback((h: HighlightDTO) => {
    setHighlights((prev) => prev.map((x) => (x.id === h.id ? h : x)));
    setActiveHighlight((cur) => (cur?.id === h.id ? h : cur));
  }, []);

  const deleteHighlight = useCallback(async (id: string) => {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setHighlights((prev) => prev.filter((x) => x.id !== id));
    setActiveHighlight((cur) => (cur?.id === id ? null : cur));
  }, []);

  const createNote = useCallback(
    async (kind: "NOTE" | "QUESTION", text: string, page?: number) => {
      const content = {
        type: "doc",
        content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
      };
      const res = await fetch(`/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBookId, ...(page ? { page } : {}), kind, content, contentText: text }),
      });
      if (!res.ok) return;
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
    },
    [userBookId],
  );

  const deleteNote = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const createLink = useCallback(
    async (fromPage: number, toPage: number, label: string) => {
      const res = await fetch(`/api/userbooks/${userBookId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPage, toPage, label }),
      });
      if (!res.ok) return;
      const { link } = await res.json();
      setLinks((prev) => [...prev, link]);
    },
    [userBookId],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/userbooks/${userBookId}/links/${id}`, { method: "DELETE" });
      if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    },
    [userBookId],
  );

  return {
    highlights,
    notes,
    links,
    activeHighlight,
    setActiveHighlight,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    createNote,
    deleteNote,
    createLink,
    deleteLink,
  };
}
