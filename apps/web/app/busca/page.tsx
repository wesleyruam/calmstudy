import Link from "next/link";
import {
  Search,
  BookOpen,
  Highlighter,
  StickyNote,
  Brain,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { searchAll, type SearchType } from "@/lib/search";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<SearchType, LucideIcon> = {
  book: BookOpen,
  highlight: Highlighter,
  note: StickyNote,
  concept: Brain,
  summary: FileText,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchAll(query) : null;

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar activeFilter="__search" />
        <main className="flex-1 px-6 py-10 md:px-10">
          <header className="mb-8">
            <h1 className="font-serif text-3xl tracking-tight">Busca</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {!query
                ? "Digite acima para buscar em livros, destaques, notas, conceitos e resumos."
                : results && results.total > 0
                  ? `${results.total} ${results.total === 1 ? "resultado" : "resultados"} para “${query}”.`
                  : `Nada encontrado para “${query}”.`}
            </p>
          </header>

          {query && results && results.total === 0 && (
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-12 text-center">
              <Search className="mx-auto size-6 text-[var(--color-ink-soft)]" />
              <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
                Tente outros termos, ou verifique a ortografia.
              </p>
            </div>
          )}

          <div className="space-y-8">
            {results?.groups.map((group) => {
              const Icon = TYPE_ICON[group.type];
              return (
                <section key={group.type}>
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
                    <Icon className="size-4" />
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                    {group.hits.map((hit) => (
                      <li key={`${hit.type}-${hit.id}`}>
                        <Link
                          href={hit.href}
                          className="block px-4 py-3 transition-colors hover:bg-[var(--color-line)]/40"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-medium">{hit.title}</span>
                            {hit.context && (
                              <span className="shrink-0 text-xs text-[var(--color-ink-soft)]">
                                {hit.context}
                              </span>
                            )}
                          </div>
                          {hit.snippet && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-ink-soft)]">
                              {hit.snippet}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
