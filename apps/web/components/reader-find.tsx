"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import type { PdfDoc } from "@/components/pdf-types";

interface Match {
  page: number;
  snippet: string;
}

// Busca no livro (Fase C): varre o texto de todas as páginas do PDF (uma vez,
// com cache) e lista as páginas que contêm o termo, com trecho e salto direto.
export function ReaderFind({
  doc,
  numPages,
  currentPage,
  onJump,
  onClose,
}: {
  doc: PdfDoc | null;
  numPages: number;
  currentPage: number;
  onJump: (page: number) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Extrai (e memoiza) o texto de cada página do documento.
  const ensureText = useCallback(async (): Promise<string[]> => {
    if (cacheRef.current) return cacheRef.current;
    if (!doc) return [];
    const pages: string[] = [];
    for (let i = 1; i <= numPages; i++) {
      try {
        const tc = await doc.getPage(i).then((p) => p.getTextContent());
        const text = (tc.items as { str?: string }[]).map((it) => it.str ?? "").join(" ");
        pages.push(text);
      } catch {
        pages.push("");
      }
    }
    cacheRef.current = pages;
    return pages;
  }, [doc, numPages]);

  const run = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setMatches(null);
      return;
    }
    setScanning(true);
    const pages = await ensureText();
    const needle = q.toLowerCase();
    const found: Match[] = [];
    for (let i = 0; i < pages.length; i++) {
      const text = pages[i] ?? "";
      const at = text.toLowerCase().indexOf(needle);
      if (at === -1) continue;
      const start = Math.max(0, at - 40);
      const snippet =
        (start > 0 ? "…" : "") +
        text.slice(start, at + needle.length + 40).trim() +
        (at + needle.length + 40 < text.length ? "…" : "");
      found.push({ page: i + 1, snippet });
    }
    setMatches(found);
    setScanning(false);
  }, [query, ensureText]);

  return (
    <div className="absolute right-4 top-2 z-30 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-calm)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="size-4 shrink-0 text-[var(--color-ink-soft)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder="Buscar no livro…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-soft)]"
        />
        {scanning && <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-ink-soft)]" />}
        <button
          onClick={onClose}
          className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
          aria-label="Fechar busca"
        >
          <X className="size-4" />
        </button>
      </div>

      {matches !== null && (
        <div className="border-t border-[var(--color-line)]">
          <p className="px-3 py-1.5 text-[11px] text-[var(--color-ink-soft)]">
            {matches.length === 0
              ? "Nenhum resultado."
              : `${matches.length} ${matches.length === 1 ? "página" : "páginas"} com o termo`}
          </p>
          {matches.length > 0 && (
            <ul className="max-h-72 overflow-y-auto pb-1">
              {matches.map((m) => (
                <li key={m.page}>
                  <button
                    onClick={() => onJump(m.page)}
                    className={[
                      "block w-full px-3 py-2 text-left transition-colors hover:bg-[var(--color-line)]/40",
                      m.page === currentPage ? "bg-[var(--color-accent-soft)]" : "",
                    ].join(" ")}
                  >
                    <span className="text-xs font-medium text-[var(--color-ink)]">Página {m.page}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-[var(--color-ink-soft)]">
                      <Highlighted text={m.snippet} query={query.trim()} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Destaca as ocorrências do termo no trecho (case-insensitive).
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (at > i) parts.push(text.slice(i, at));
    parts.push(
      <mark key={key++} className="rounded bg-[var(--color-accent-soft)] text-[var(--color-ink)]">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    i = at + needle.length;
  }
  return <>{parts}</>;
}
