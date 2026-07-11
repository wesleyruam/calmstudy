import "server-only";
import { subscribe } from "@calmstudy/infra";

// Monta uma resposta SSE que espelha um canal do Redis pub/sub. Cada mensagem do
// canal vira um evento `data:`; há heartbeat de comentário p/ manter a conexão viva.
// Limpa a assinatura e o timer quando o cliente desconecta (req.signal → abort).
export function sseResponse(channel: string, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  let unsub: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const push = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          // stream já fechado
        }
      };
      push(": connected\n\n");
      unsub = subscribe(channel, (payload) => push(`data: ${JSON.stringify(payload)}\n\n`));
      heartbeat = setInterval(() => push(": ping\n\n"), 25_000);

      const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          // já fechado
        }
      };
      if (signal.aborted) cleanup();
      else signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // impede buffering de proxy (nginx) que mataria o tempo real
    },
  });
}
