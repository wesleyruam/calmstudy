// Tipos compartilhados servidor/cliente das métricas por livro (E4).

export interface GoalDTO {
  id: string;
  title: string;
  kind: string;
  target: number | null;
  done: boolean;
}

export interface TaskDTO {
  id: string;
  title: string;
  done: boolean;
  order: number;
}

export interface DaySeconds {
  day: string; // YYYY-MM-DD
  seconds: number;
}

export interface DashboardData {
  userBookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: string;
  progress: number;
  pages: number | null;
  lastPage: number;
  lastReadAt: string | null;
  totalSeconds: number;
  sessionsCount: number;
  counts: {
    highlights: number;
    notes: number;
    summaries: number;
    bookmarks: number;
    concepts: number;
    reviewPending: number;
  };
  recentDays: DaySeconds[];
  goals: GoalDTO[];
  tasks: TaskDTO[];
}

export interface ActivityDay {
  day: string;
  label: string;
  seconds: number;
  highlights: number;
  notes: number;
  concepts: number;
  summaries: number;
}

export interface StatsData {
  totalSeconds: number;
  streak: number;
  avgSessionSeconds: number;
  pagesRead: number;
  booksTotal: number;
  booksFinished: number;
  booksReading: number;
  counts: {
    highlights: number;
    notes: number;
    concepts: number;
    summaries: number;
  };
  activity: ActivityDay[];
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${totalSeconds}s`;
}
