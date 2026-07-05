"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

// Menu do usuário (navbar): inicial + popover com e-mail e "Sair".
export function UserMenu({ name, email }: { name: string | null; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Conta"
        className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-soft)] text-sm font-medium text-[var(--color-accent)] transition-transform hover:scale-105"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-calm)]">
          <div className="border-b border-[var(--color-line)] px-3 py-2.5">
            {name && <p className="truncate text-sm font-medium">{name}</p>}
            <p className="truncate text-xs text-[var(--color-ink-soft)]">{email}</p>
          </div>
          <button
            onClick={() => signOut({ redirectTo: "/entrar" })}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/50 hover:text-[var(--color-ink)]"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
