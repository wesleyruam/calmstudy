"use client";

import { useState } from "react";
import Link from "next/link";
import { HighlightItem } from "@/components/highlight-item";
import type { TimelineDay } from "@/lib/timeline";

export function TimelineView({ days: initial }: { days: TimelineDay[] }) {
  const [days, setDays] = useState<TimelineDay[]>(initial);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const { highlight } = await res.json();
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        highlights: d.highlights.map((h) => (h.id === id ? { ...h, ...highlight, notes: h.notes } : h)),
      })),
    );
  }
  async function remove(id: string) {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setDays((prev) =>
      prev
        .map((d) => ({ ...d, highlights: d.highlights.filter((h) => h.id !== id) }))
        .filter((d) => d.highlights.length > 0 || d.noteCount > 0),
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          ← Biblioteca
        </Link>
        <h1 className="mt-3 font-serif text-2xl">Linha do tempo</h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
          Tudo que você produziu, dia a dia.
        </p>
      </header>

      {days.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-soft)]">
          Sua linha do tempo aparece aqui conforme você estuda.
        </p>
      ) : (
        <div className="space-y-8">
          {days.map((d) => (
            <section key={d.day}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-serif text-lg">{d.label}</h2>
                <span className="text-xs text-[var(--color-ink-soft)]">
                  {d.highlights.length} {d.highlights.length === 1 ? "destaque" : "destaques"}
                  {d.noteCount > 0 &&
                    ` · ${d.noteCount} ${d.noteCount === 1 ? "nota" : "notas"}`}
                </span>
              </div>
              <ul className="space-y-4">
                {d.highlights.map((h) => (
                  <HighlightItem key={h.id} h={h} showBook onPatch={patch} onRemove={remove} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
