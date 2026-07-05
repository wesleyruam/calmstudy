"use client";

import { useEffect, useRef, useState } from "react";
import { Users, User, Globe, ChevronDown, Check } from "lucide-react";

export type ReaderLayer = "personal" | "community" | string; // ou o id de um espaço

// Seletor de camada do leitor: Pessoal · Comunidade · Espaços de Estudo.
export function LayerSelector({
  spaces,
  community,
  value,
  onChange,
}: {
  spaces: { id: string; name: string }[];
  community: boolean;
  value: ReaderLayer;
  onChange: (l: ReaderLayer) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const activeSpace = value === "personal" || value === "community" ? null : spaces.find((s) => s.id === value);
  const isCommunity = value === "community";
  const highlight = !!activeSpace || isCommunity;
  const label = activeSpace ? activeSpace.name : isCommunity ? "Comunidade" : "Pessoal";
  const Glyph = activeSpace ? Users : isCommunity ? Globe : User;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
          highlight
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
            : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/40",
        ].join(" ")}
        title="Camada de conhecimento"
      >
        <Glyph className="size-3.5" />
        <span className="max-w-32 truncate">{label}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-40 w-56 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-calm)]">
          <Row icon={<User className="size-4" />} label="Pessoal" hint="Só você" active={value === "personal"} onClick={() => { onChange("personal"); setOpen(false); }} />
          {community && (
            <Row icon={<Globe className="size-4" />} label="Comunidade" hint="Conhecimento público" active={value === "community"} onClick={() => { onChange("community"); setOpen(false); }} />
          )}
          {spaces.length > 0 && (
            <>
              <div className="border-t border-[var(--color-line)]" />
              <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">Espaços</p>
              {spaces.map((s) => (
                <Row key={s.id} icon={<Users className="size-4" />} label={s.name} hint="Discussão do grupo" active={value === s.id} onClick={() => { onChange(s.id); setOpen(false); }} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, hint, active, onClick }: { icon: React.ReactNode; label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-line)]/50">
      <span className="text-[var(--color-ink-soft)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        <span className="block text-[11px] text-[var(--color-ink-soft)]">{hint}</span>
      </span>
      {active && <Check className="size-4 text-[var(--color-accent)]" />}
    </button>
  );
}
