import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, type ProcessDocumentJob } from "@calmbook/core";
import { prisma } from "@calmbook/db";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Worker de ingestão de documentos.
// Fase 1: marca READY. As etapas reais (parse, capa, OCR, embeddings) entram aqui,
// cada uma atrás de uma porta de @calmbook/core — nunca na request HTTP.
const worker = new Worker<ProcessDocumentJob>(
  QUEUES.documentProcessing,
  async (job) => {
    const { bookId, format } = job.data;
    console.log(`[worker] processando book=${bookId} format=${format}`);

    // TODO Fase 1: parser.parse() → texto, páginas, capa, metadata
    // TODO Fase 5: OCR (Tesseract) + embeddings (Voyage → pgvector)

    await prisma.book.update({
      where: { id: bookId },
      data: { status: "READY" },
    });

    return { bookId, status: "READY" };
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => console.log(`[worker] ok job=${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] falhou job=${job?.id}`, err));

console.log("[worker] CalmBook worker no ar, ouvindo a fila de documentos.");
