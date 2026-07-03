import { Worker } from "bullmq";
import { QUEUES, type ProcessDocumentJob } from "@calmstudy/core";
import { prisma } from "@calmstudy/db";
import { FilesystemStorage, createRedis, storeCover } from "@calmstudy/infra";
import { parserFor, renderCover } from "@calmstudy/infra/worker";

const connection = createRedis();
const storage = new FilesystemStorage();

// Worker de ingestão de documentos. Trabalho pesado vive AQUI, nunca na request HTTP.
// Fase 1: extrai texto/páginas/metadata + renderiza capa (1ª página).
const worker = new Worker<ProcessDocumentJob>(
  QUEUES.documentProcessing,
  async (job) => {
    const { bookId, fileKey, format, coverOnly } = job.data;
    const bytes = await storage.get(fileKey);

    // Backfill: só (re)gera a capa, sem mexer em texto/metadata (preserva rename).
    if (coverOnly) {
      const cover = await renderCover(format, bytes);
      const coverUrl = cover ? await storeCover(bookId, cover) : null;
      await prisma.book.update({ where: { id: bookId }, data: { coverUrl } });
      console.log(`[worker] capa (backfill) book=${bookId} ${coverUrl ? "ok" : "sem capa"}`);
      return { bookId, coverOnly: true };
    }

    console.log(`[worker] processando book=${bookId} format=${format}`);
    const parser = parserFor(format);
    const cover = await renderCover(format, bytes);
    const coverUrl = cover ? await storeCover(bookId, cover) : undefined;

    if (!parser) {
      // Sem parser p/ o formato ainda (ex: EPUB/CBZ na Fase 4): só capa + READY.
      await prisma.book.update({ where: { id: bookId }, data: { status: "READY", coverUrl } });
      return { bookId, status: "READY", parsed: false };
    }

    const parsed = await parser.parse(bytes);
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: "READY",
        coverUrl,
        pages: parsed.pages,
        textContent: parsed.text.slice(0, 1_000_000),
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
  const exhausted = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  if (exhausted && job?.data.bookId && !job.data.coverOnly) {
    await prisma.book
      .update({ where: { id: job.data.bookId }, data: { status: "FAILED" } })
      .catch(() => {});
  }
});

console.log("[worker] CalmStudy worker no ar, ouvindo a fila de documentos.");
