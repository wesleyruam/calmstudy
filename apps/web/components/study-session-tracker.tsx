"use client";

import { useEffect, useRef } from "react";

// Sessão de estudo (módulo 11): conta o tempo ATIVO (aba visível + sem ociosidade),
// manda heartbeat periódico e finaliza a sessão ao sair.
export function StudySessionTracker({
  userBookId,
  page,
}: {
  userBookId: string;
  page: number;
}) {
  const pageRef = useRef(page);
  pageRef.current = page;

  const sessionId = useRef<string | null>(null);
  const seconds = useRef(0);
  const lastActivity = useRef(Date.now());
  const lastSent = useRef(-1);

  useEffect(() => {
    let alive = true;
    const IDLE_MS = 90_000;

    const bump = () => (lastActivity.current = Date.now());
    const events = ["keydown", "mousemove", "click", "scroll", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    (async () => {
      const res = await fetch(`/api/userbooks/${userBookId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startPage: pageRef.current }),
      });
      if (res.ok && alive) sessionId.current = (await res.json()).session.id;
    })().catch(() => {});

    const tick = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastActivity.current < IDLE_MS
      ) {
        seconds.current += 1;
      }
    }, 1000);

    const send = (ended: boolean, keepalive = false) => {
      if (!sessionId.current) return;
      if (!ended && seconds.current === lastSent.current) return;
      lastSent.current = seconds.current;
      fetch(`/api/sessions/${sessionId.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: seconds.current, endPage: pageRef.current, ended }),
        keepalive,
      }).catch(() => {});
    };

    const beat = setInterval(() => send(false), 20_000);
    const onVis = () => document.visibilityState === "hidden" && send(false, true);
    const onLeave = () => send(true, true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onLeave);

    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(beat);
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onLeave);
      send(true, true);
    };
  }, [userBookId]);

  return null;
}
