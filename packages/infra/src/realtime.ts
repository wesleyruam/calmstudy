import type { Redis } from "ioredis";
import { createRedis } from "./queue.js";

// Pub/sub leve sobre o Redis para tempo real (SSE da discussão dos Espaços).
// Uma conexão PUBLISHER e uma SUBSCRIBER compartilhadas por processo — em ioredis
// uma conexão em modo subscriber não pode rodar comandos normais, então precisam
// ser distintas. O subscriber demultiplexa por canal e faz refcount das
// assinaturas (SUBSCRIBE no 1º interessado, UNSUBSCRIBE quando o último sai).

type Handler = (payload: unknown) => void;

const g = globalThis as unknown as {
  __rtPub?: Redis;
  __rtSub?: Redis;
  __rtHandlers?: Map<string, Set<Handler>>;
};

function handlers(): Map<string, Set<Handler>> {
  return (g.__rtHandlers ??= new Map());
}

function publisher(): Redis {
  return (g.__rtPub ??= createRedis());
}

function subscriber(): Redis {
  if (g.__rtSub) return g.__rtSub;
  const s = createRedis();
  s.on("message", (channel, message) => {
    const set = handlers().get(channel);
    if (!set || set.size === 0) return;
    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      payload = message;
    }
    for (const h of set) {
      try {
        h(payload);
      } catch {
        // handler ruim não pode derrubar os outros
      }
    }
  });
  g.__rtSub = s;
  return s;
}

/** Publica um evento num canal. Nunca lança — Redis fora do ar não pode quebrar a escrita. */
export async function publish(channel: string, payload: unknown): Promise<void> {
  try {
    await publisher().publish(channel, JSON.stringify(payload));
  } catch {
    // ignora — o tempo real é best-effort; a operação de escrita já aconteceu
  }
}

/** Assina um canal; devolve a função de cancelamento (idempotente). */
export function subscribe(channel: string, handler: Handler): () => void {
  const map = handlers();
  let set = map.get(channel);
  if (!set) {
    set = new Set();
    map.set(channel, set);
    subscriber()
      .subscribe(channel)
      .catch(() => {});
  }
  set.add(handler);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    const s = map.get(channel);
    if (!s) return;
    s.delete(handler);
    if (s.size === 0) {
      map.delete(channel);
      subscriber()
        .unsubscribe(channel)
        .catch(() => {});
    }
  };
}
