import Link from "next/link";
import type { LibraryItem } from "@/lib/library";

// Card de livro. Capa real (render da pág. 1) entra depois; por ora, uma capa
// gerada determinística a partir do título — calma e sem ruído visual.
export function BookCard({ item }: { item: LibraryItem }) {
  const processing = item.status === "PROCESSING";
  const failed = item.status === "FAILED";
  const readable = item.status === "READY";

  const inner = (
    <div className="group flex flex-col">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-calm)] ring-1 ring-[var(--color-line)] transition-transform duration-300 group-hover:-translate-y-1"
        style={{ background: coverGradient(item.title) }}
      >
        <div className="absolute inset-0 flex items-end p-4">
          <span className="font-serif text-lg leading-tight text-white/95 drop-shadow-sm">
            {item.title}
          </span>
        </div>
        <span className="absolute right-2 top-2 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {item.format}
        </span>

        {(processing || failed) && (
          <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-[2px]">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
              {processing ? "Processando…" : "Falhou"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-[var(--color-ink-soft)]">
          {item.author ?? "Autor desconhecido"}
          {item.pages ? ` · ${item.pages} págs` : ""}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-line)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)]"
            style={{ width: `${Math.round(item.progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  // READY → abre o leitor; senão, card sem link (processando/falhou).
  return readable ? (
    <Link href={`/read/${item.userBookId}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// Gradiente determinístico a partir do título (matiz estável por livro).
function coverGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(150deg, oklch(0.55 0.09 ${h}), oklch(0.42 0.07 ${(h + 40) % 360}))`;
}
