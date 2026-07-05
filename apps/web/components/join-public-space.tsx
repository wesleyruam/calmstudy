"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

export function JoinPublicSpace({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function join() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/spaces/${spaceId}/join-public`, { method: "POST" });
    if (res.ok) router.push(`/espaco/${spaceId}`);
    else setBusy(false);
  }

  return (
    <button
      onClick={join}
      disabled={busy}
      className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-line)]/40 disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Entrar
    </button>
  );
}
