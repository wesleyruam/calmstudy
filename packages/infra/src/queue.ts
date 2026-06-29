import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, type ProcessDocumentJob } from "@calmbook/core";

/** Conexão Redis compartilhada (produtor no web, consumidor no worker). */
export function createRedis(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    maxRetriesPerRequest: null,
  });
}

// Singleton da fila no processo do web (evita recriar a cada request/hot-reload).
const globalForQueue = globalThis as unknown as {
  documentQueue?: Queue<ProcessDocumentJob>;
};

export function getDocumentQueue(): Queue<ProcessDocumentJob> {
  globalForQueue.documentQueue ??= new Queue<ProcessDocumentJob>(QUEUES.documentProcessing, {
    connection: createRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  return globalForQueue.documentQueue;
}

export async function enqueueDocument(job: ProcessDocumentJob): Promise<void> {
  await getDocumentQueue().add("process", job);
}
