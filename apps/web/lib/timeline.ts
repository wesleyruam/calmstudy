import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import { serializeHighlight } from "./highlight-shared";
import { serializeNote } from "./note-shared";
import type { StudyHighlight } from "@/components/highlight-item";

export interface TimelineDay {
  day: string; // YYYY-MM-DD
  label: string; // rótulo amigável (Hoje / Ontem / data)
  highlights: StudyHighlight[];
  noteCount: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  const today = dayKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return "Hoje";
  if (key === dayKey(y)) return "Ontem";
  const [yr, mo, dd] = key.split("-");
  return `${dd}/${mo}/${yr}`;
}

// Linha do tempo (módulo 14): o que foi produzido, por dia (mais recente primeiro).
export async function getTimeline(): Promise<TimelineDay[]> {
  const user = await currentUser();

  const [highlights, notes] = await Promise.all([
    prisma.highlight.findMany({
      where: { userBook: { userId: user.id, deletedAt: null } },
      include: {
        tags: { include: { tag: true } },
        notes: { include: { tags: { include: { tag: true } } }, orderBy: { updatedAt: "desc" } },
        _count: { select: { notes: true } },
        userBook: { include: { book: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      select: { createdAt: true },
    }),
  ]);

  const days = new Map<string, TimelineDay>();
  const get = (key: string) => {
    let d = days.get(key);
    if (!d) {
      d = { day: key, label: dayLabel(key), highlights: [], noteCount: 0 };
      days.set(key, d);
    }
    return d;
  };

  for (const h of highlights) {
    get(dayKey(h.createdAt)).highlights.push({
      ...serializeHighlight(h),
      userBookId: h.userBookId,
      bookTitle: h.userBook.book.title,
      notes: h.notes.map(serializeNote),
    });
  }
  for (const n of notes) get(dayKey(n.createdAt)).noteCount++;

  return [...days.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}
