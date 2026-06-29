import { Worker } from "bullmq";
import { QUEUES, type ProcessDocumentJob } from "@calmbook/core";
import { prisma } from "@calmbook/db";
import { FilesystemStorage, createRedis } from "@calmbook/infra";
import { parserFor } from "@calmbook/infra/worker";

const connection = createRedis();
const storage = new FilesystemStorage();

// Worker de ingestão de documentos. Trabalho pesado vive AQUI, nunca na request HTTP.
// Fase 1: extrai texto/páginas/metadata do PDF. Fase 5: OCR + embeddings (Voyage/pgvector).
const worker = new Worker<ProcessDocumentJob>(
  QUEUES.documentProcessing,
  async (job) => {
    const { bookId, fileKey, format } = job.data;
    console.log(`[worker] processando book=${bookId} format=${format}`);

    const parser = parserFor(format);
    if (!parser) {
      // Sem parser p/ o formato ainda: marca READY sem extração (ex: EPUB/CBZ na Fase 4).
      await prisma.book.update({ where: { id: bookId }, data: { status: "READY" } });
      return { bookId, status: "READY", parsed: false };
    }

    const bytes = await storage.get(fileKey);
    const parsed = await parser.parse(bytes);

    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: "READY",
        pages: parsed.pages,
        textContent: parsed.text.slice(0, 1_000_000), // limite defensivo (FTS depois)
        title: parsed.metadata.title ?? undefined,
        author: parsed.metadata.author ?? undefined,
        language: parsed.metadata.language ?? undefined,
      },
    });

    console.log(`[worker] book=${bookId} pronto (${parsed.pages ?? "?"} páginas)`);
    return { bookId, status: "READY", parsed: true };
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => console.log(`[worker] ok job=${job.id}`));
worker.on("failed", async (job, err) => {
  console.error(`[worker] falhou job=${job?.id} (tentativa ${job?.attemptsMade})`, err);
  // só marca FAILED quando esgotaram as tentativas
  const exhausted = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  if (exhausted && job?.data.bookId) {
    await prisma.book
      .update({ where: { id: job.data.bookId }, data: { status: "FAILED" } })
      .catch(() => {});
  }
});

console.log("[worker] CalmBook worker no ar, ouvindo a fila de documentos.");
