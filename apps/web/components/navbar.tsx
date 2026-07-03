import { UploadButton } from "@/components/uploader";
import { ThemeToggle } from "@/components/theme-toggle";

// Navbar superior — vidro fosco, respira. Interatividade (busca, tema, perfil) entra na Fase 2.
export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-paper)]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <BookGlyph />
          </span>
          <span className="font-serif text-lg tracking-tight">CalmStudy</span>
        </div>

        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-ink-soft)] shadow-[var(--shadow-calm)]">
          <SearchGlyph />
          <span>Buscar livros, autores, notas…</span>
        </div>

        <nav className="flex items-center gap-1.5">
          <UploadButton label="Upload" variant="ghost" />
          <IconButton label="Notificações"><BellGlyph /></IconButton>
          <ThemeToggle />
          <span className="ml-1 size-8 rounded-full bg-[var(--color-line)]" />
        </nav>
      </div>
    </header>
  );
}

function IconButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
    >
      {children}
    </button>
  );
}

/* glyphs — traço fino, sem peso visual */
const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const BookGlyph = () => (<svg {...s}><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h12" /></svg>);
const SearchGlyph = () => (<svg {...s} width={16} height={16}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
const BellGlyph = () => (<svg {...s}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>);
