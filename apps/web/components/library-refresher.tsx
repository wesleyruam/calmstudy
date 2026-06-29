"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Enquanto houver livros em PROCESSING, refaz a consulta do servidor a cada 2s
 * para "acender" os cards quando o worker termina. Sem WebSocket por ora.
 */
export function LibraryRefresher({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}
