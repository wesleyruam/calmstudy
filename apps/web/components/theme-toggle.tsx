"use client";

import { useEffect, useState } from "react";

// Alterna claro/escuro aplicando a classe .dark no <html> e persistindo a escolha.
// O flash inicial é evitado pelo script inline em layout.tsx (roda antes da pintura).
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("calmstudy-theme", next ? "dark" : "light");
    } catch {
      // localStorage indisponível — ignora
    }
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Tema claro" : "Tema escuro"}
      className="grid size-9 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
    >
      {dark ? <SunGlyph /> : <MoonGlyph />}
    </button>
  );
}

const s = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const MoonGlyph = () => (
  <svg {...s}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" />
  </svg>
);
const SunGlyph = () => (
  <svg {...s}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
