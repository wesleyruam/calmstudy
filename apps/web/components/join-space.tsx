"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function JoinSpace({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/spaces/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      setError("Não foi possível entrar. O convite pode ter expirado.");
      setBusy(false);
      return;
    }
    const { spaceId } = await res.json();
    router.push(`/espaco/${spaceId}`);
  }

  return (
    <>
      <button
        onClick={join}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Entrar no espaço
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </>
  );
}
