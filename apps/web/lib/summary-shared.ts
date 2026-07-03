import type { TiptapDoc } from "@/lib/note-shared";

export interface SummaryDTO {
  id: string;
  chapter: string | null;
  title: string | null;
  content: TiptapDoc;
  contentText: string | null;
  updatedAt: string;
}

interface SummaryRow {
  id: string;
  chapter: string | null;
  title: string | null;
  content: unknown;
  contentText: string | null;
  updatedAt: Date | string;
}

export function serializeSummary(s: SummaryRow): SummaryDTO {
  return {
    id: s.id,
    chapter: s.chapter,
    title: s.title,
    content: (s.content ?? { type: "doc" }) as TiptapDoc,
    contentText: s.contentText,
    updatedAt: new Date(s.updatedAt).toISOString(),
  };
}
