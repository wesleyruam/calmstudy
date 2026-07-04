import { Library, Folder } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BookCard } from "@/components/book-card";
import { UploadButton, DropOverlay } from "@/components/uploader";
import { LibraryRefresher } from "@/components/library-refresher";
import { getLibrary, FILTER_LABELS, type LibraryFilter } from "@/lib/library";
import { getShelves } from "@/lib/shelves";

export const dynamic = "force-dynamic";

const VALID_FILTERS: LibraryFilter[] = [
  "all",
  "reading",
  "finished",
  "favorites",
  "recent",
  "questions",
  "unannotated",
  "review",
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; shelf?: string }>;
}) {
  const sp = await searchParams;
  const shelfId = sp.shelf;
  const filter: LibraryFilter =
    !shelfId && sp.filter && VALID_FILTERS.includes(sp.filter as LibraryFilter)
      ? (sp.filter as LibraryFilter)
      : "all";

  const [items, shelves] = await Promise.all([getLibrary(filter, shelfId), getShelves()]);
  const shelfOptions = shelves.map((s) => ({ id: s.id, name: s.name }));
  const processing = items.some((i) => i.status === "PROCESSING");

  const activeShelf = shelfId ? shelves.find((s) => s.id === shelfId) : undefined;
  const heading = activeShelf ? activeShelf.name : FILTER_LABELS[filter];

  return (
    <div className="min-h-dvh">
      <Navbar />
      <DropOverlay />
      <LibraryRefresher active={processing} />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar activeFilter={filter} activeShelf={shelfId} />
        <main className="flex-1 px-6 py-10 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">{heading}</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {items.length
                  ? `${items.length} ${items.length === 1 ? "documento" : "documentos"}`
                  : emptyHint(filter, !!activeShelf)}
              </p>
            </div>
            {items.length > 0 && <UploadButton label="Importar" variant="ghost" />}
          </div>

          {items.length === 0 ? (
            <EmptyState filter={filter} shelf={!!activeShelf} />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <BookCard key={item.userBookId} item={item} shelves={shelfOptions} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function emptyHint(filter: LibraryFilter, shelf: boolean): string {
  if (shelf) return "Nenhum livro nesta prateleira ainda.";
  switch (filter) {
    case "all":
      return "Tudo respira. Comece importando um documento.";
    case "questions":
      return "Nenhuma dúvida pendente nos seus livros.";
    case "unannotated":
      return "Todos os seus livros já têm anotações.";
    case "review":
      return "Nada aguardando revisão.";
    default:
      return "Nada por aqui ainda.";
  }
}

function EmptyState({ filter, shelf }: { filter: LibraryFilter; shelf: boolean }) {
  // Estado vazio com convite ao upload só faz sentido na biblioteca toda.
  const inviteUpload = filter === "all" && !shelf;
  return (
    <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/40 px-6 py-24 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          {shelf ? <Folder className="size-6" /> : <Library className="size-6" />}
        </div>
        <h2 className="mt-5 font-serif text-xl">
          {inviteUpload ? "Sua estante está silenciosa" : "Nada por aqui"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          {inviteUpload
            ? "Arraste um PDF, EPUB ou outro documento — ou clique abaixo. O CalmStudy extrai título, autor e páginas automaticamente."
            : shelf
              ? "Passe o mouse sobre um livro e use o menu (⋯) para adicioná-lo a esta prateleira."
              : "Nenhum livro corresponde a este filtro por enquanto."}
        </p>
        {inviteUpload && (
          <div className="mt-6 flex justify-center">
            <UploadButton />
          </div>
        )}
      </div>
    </div>
  );
}
