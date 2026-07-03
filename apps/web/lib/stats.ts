import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";
import type { ActivityDay, StatsData } from "./dashboard-shared";

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

// Estatísticas gerais (módulo 19) + histórico recente (módulo 20).
export async function getStats(): Promise<StatsData> {
  const user = await getOrCreateDefaultUser();
  const scope = { userBook: { userId: user.id, deletedAt: null } };
  const cutoff = new Date(Date.now() - 13 * 86400_000);
  cutoff.setHours(0, 0, 0, 0);

  const [sessions, userBooks, highlights, notes, concepts, summaries, recent] = await Promise.all([
    prisma.studySession.findMany({
      where: scope,
      select: { startedAt: true, seconds: true, startPage: true, endPage: true },
    }),
    prisma.userBook.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { status: true },
    }),
    prisma.highlight.count({ where: scope }),
    prisma.note.count({ where: { userId: user.id } }),
    prisma.concept.count({ where: { userId: user.id } }),
    prisma.summary.count({ where: scope }),
    // itens criados nos últimos 14 dias (para o histórico)
    Promise.all([
      prisma.highlight.findMany({ where: { ...scope, createdAt: { gte: cutoff } }, select: { createdAt: true } }),
      prisma.note.findMany({ where: { userId: user.id, createdAt: { gte: cutoff } }, select: { createdAt: true } }),
      prisma.concept.findMany({ where: { userId: user.id, createdAt: { gte: cutoff } }, select: { createdAt: true } }),
      prisma.summary.findMany({ where: { ...scope, createdAt: { gte: cutoff } }, select: { createdAt: true } }),
    ]),
  ]);

  const totalSeconds = sessions.reduce((a, s) => a + s.seconds, 0);
  const pagesRead = sessions.reduce(
    (a, s) => a + Math.max(0, (s.endPage ?? 0) - (s.startPage ?? 0)),
    0,
  );
  const avgSessionSeconds = sessions.length ? Math.round(totalSeconds / sessions.length) : 0;

  // streak: dias consecutivos (até hoje/ontem) com sessão
  const sessionDays = new Set(sessions.map((s) => dayKey(s.startedAt)));
  let streak = 0;
  const cursor = new Date();
  if (!sessionDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // permite começar de ontem
  while (sessionDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const [recHl, recNt, recCp, recSm] = recent;
  const map = new Map<string, ActivityDay>();
  const get = (key: string) => {
    let d = map.get(key);
    if (!d) {
      d = { day: key, label: dayLabel(key), seconds: 0, highlights: 0, notes: 0, concepts: 0, summaries: 0 };
      map.set(key, d);
    }
    return d;
  };
  for (const s of sessions) if (s.startedAt >= cutoff) get(dayKey(s.startedAt)).seconds += s.seconds;
  for (const h of recHl) get(dayKey(h.createdAt)).highlights++;
  for (const n of recNt) get(dayKey(n.createdAt)).notes++;
  for (const cpt of recCp) get(dayKey(cpt.createdAt)).concepts++;
  for (const s of recSm) get(dayKey(s.createdAt)).summaries++;
  const activity = [...map.values()]
    .filter((d) => d.seconds || d.highlights || d.notes || d.concepts || d.summaries)
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  return {
    totalSeconds,
    streak,
    avgSessionSeconds,
    pagesRead,
    booksTotal: userBooks.length,
    booksFinished: userBooks.filter((b) => b.status === "FINISHED").length,
    booksReading: userBooks.filter((b) => b.status === "READING").length,
    counts: { highlights, notes, concepts, summaries },
    activity,
  };
}
