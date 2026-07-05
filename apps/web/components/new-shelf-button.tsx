"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/dialog-provider";

// Botão "+" que cria uma prateleira com um diálogo calmo.
export function NewShelfButton() {
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const name = await dialog.prompt({
      title: "Nova prateleira",
      label: "Nome da prateleira",
      placeholder: "Ex.: Filosofia, Para reler…",
      confirmLabel: "Criar",
    });
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Não foi possível criar a prateleira.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={create}
      disabled={busy}
      aria-label="Nova prateleira"
      className="grid size-5 place-items-center rounded-md text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60 disabled:opacity-50"
    >
      +
    </button>
  );
}
