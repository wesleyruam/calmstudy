import Link from "next/link";
import { formatDuration, type StatsData } from "@/lib/dashboard-shared";

export function StatsView({ data }: { data: StatsData }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-2xl">Estatísticas</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">Sua evolução no estudo.</p>
      </header>

      {/* destaque: tempo + streak */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big label="Horas estudadas" value={formatDuration(data.totalSeconds)} />
        <Big label="Dias seguidos" value={`${data.streak} 🔥`} />
        <Big label="Páginas lidas" value={String(data.pagesRead)} />
        <Big label="Média/sessão" value={formatDuration(data.avgSessionSeconds)} />
      </div>

      {/* livros */}
      <h2 className="mb-2 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        Livros
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Small label="Concluídos" value={data.booksFinished} />
        <Small label="Em andamento" value={data.booksReading} />
        <Small label="Total" value={data.booksTotal} />
      </div>

      {/* produção */}
      <h2 className="mb-2 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        Produção
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Small label="Destaques" value={data.counts.highlights} />
        <Small label="Notas" value={data.counts.notes} />
        <Small label="Conceitos" value={data.counts.concepts} />
        <Small label="Resumos" value={data.counts.summaries} />
      </div>

      {/* histórico */}
      <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        Histórico recente
      </h2>
      {data.activity.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Seu histórico aparece aqui conforme você estuda.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
          {data.activity.map((d) => {
            const parts: string[] = [];
            if (d.seconds) parts.push(formatDuration(d.seconds));
            if (d.highlights) parts.push(`${d.highlights} ${d.highlights === 1 ? "destaque" : "destaques"}`);
            if (d.notes) parts.push(`${d.notes} ${d.notes === 1 ? "nota" : "notas"}`);
            if (d.concepts) parts.push(`${d.concepts} ${d.concepts === 1 ? "conceito" : "conceitos"}`);
            if (d.summaries) parts.push(`${d.summaries} ${d.summaries === 1 ? "resumo" : "resumos"}`);
            return (
              <li key={d.day} className="flex items-center gap-3 px-4 py-3">
                <span className="w-20 shrink-0 text-sm font-medium">{d.label}</span>
                <span className="text-sm text-[var(--color-ink-soft)]">{parts.join(" · ")}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Small({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-0.5 text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}
