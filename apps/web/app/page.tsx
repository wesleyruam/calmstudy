import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BookCard } from "@/components/book-card";
import { UploadButton, DropOverlay } from "@/components/uploader";
import { LibraryRefresher } from "@/components/library-refresher";
import { getLibrary } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const items = await getLibrary();
  const processing = items.some((i) => i.status === "PROCESSING");

  return (
    <div className="min-h-dvh">
      <Navbar />
      <DropOverlay />
      <LibraryRefresher active={processing} />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main className="flex-1 px-6 py-10 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">Biblioteca</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {items.length
                  ? `${items.length} ${items.length === 1 ? "documento" : "documentos"}`
                  : "Tudo respira. Comece importando um documento."}
              </p>
            </div>
            {items.length > 0 && <UploadButton label="Importar" variant="ghost" />}
          </div>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <BookCard key={item.userBookId} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/40 px-6 py-24 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-2xl">
          📚
        </div>
        <h2 className="mt-5 font-serif text-xl">Sua estante está silenciosa</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          Arraste um PDF, EPUB ou outro documento — ou clique abaixo. O CalmBook extrai
          título, autor e páginas automaticamente.
        </p>
        <div className="mt-6 flex justify-center">
          <UploadButton />
        </div>
      </div>
    </div>
  );
}
