import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import type { DashboardData, DaySeconds } from "./dashboard-shared";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Dashboard do livro (módulo 10): tempo, progresso, contagens, metas, checklist.
export async function getBookDashboard(userBookId: string): Promise<DashboardData | null> {
  const user = await currentUser();
  const ub = await prisma.userBook.findFirst({
    where: { id: userBookId, userId: user.id, deletedAt: null },
    include: {
      book: true,
      _count: {
        select: {
          highlights: true,
          notes: true,
          summaries: true,
          bookmarks: true,
          concepts: true,
        },
      },
      goals: { orderBy: { createdAt: "asc" } },
      tasks: { orderBy: { order: "asc" } },
    },
  });
  if (!ub) return null;

  const [sessionAgg, reviewPending, sessions] = await Promise.all([
    prisma.studySession.aggregate({
      where: { userBookId },
      _sum: { seconds: true },
      _count: true,
    }),
    prisma.highlight.count({ where: { userBookId, reviewStatus: "PENDING" } }),
    prisma.studySession.findMany({
      where: { userBookId, startedAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
      select: { startedAt: true, seconds: true },
    }),
  ]);

  // agrega segundos por dia dos últimos 14 dias
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startedAt), (byDay.get(dayKey(s.startedAt)) ?? 0) + s.seconds);
  const recentDays: DaySeconds[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = dayKey(d);
    recentDays.push({ day: key, seconds: byDay.get(key) ?? 0 });
  }

  return {
    userBookId: ub.id,
    title: ub.book.title,
    author: ub.book.author,
    coverUrl: ub.book.coverUrl,
    status: ub.status,
    progress: ub.progress,
    pages: ub.book.pages,
    lastPage: ub.lastPage,
    lastReadAt: ub.lastReadAt?.toISOString() ?? null,
    totalSeconds: sessionAgg._sum.seconds ?? 0,
    sessionsCount: sessionAgg._count,
    counts: {
      highlights: ub._count.highlights,
      notes: ub._count.notes,
      summaries: ub._count.summaries,
      bookmarks: ub._count.bookmarks,
      concepts: ub._count.concepts,
      reviewPending,
    },
    recentDays,
    goals: ub.goals.map((g) => ({
      id: g.id,
      title: g.title,
      kind: g.kind,
      target: g.target,
      done: g.done,
    })),
    tasks: ub.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done, order: t.order })),
  };
}
