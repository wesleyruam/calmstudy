import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

// Shell da biblioteca. Estado vazio por enquanto — o grid de cards conecta ao
// banco na Fase 1 (upload → worker → READY). Veja docs/ROADMAP.md.
export default function LibraryPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main className="flex-1 px-6 py-10 md:px-10">
          <div className="mb-8">
            <h1 className="font-serif text-3xl tracking-tight">Biblioteca</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Tudo respira. Comece importando um documento.
            </p>
          </div>

          <EmptyState />
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
          Arraste um PDF, EPUB ou outro documento. O CalmBook extrai título, autor, capa e
          páginas automaticamente — você só precisa ler.
        </p>
        <button className="mt-6 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Importar documento
        </button>
      </div>
    </div>
  );
}
