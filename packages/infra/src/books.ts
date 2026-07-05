import { createHash, randomUUID } from "node:crypto";
import { prisma, type BookFormat } from "@calmstudy/db";
import { FilesystemStorage } from "./storage/filesystem.js";
import { enqueueDocument } from "./queue.js";

const storage = new FilesystemStorage();

const EXT_TO_FORMAT: Record<string, BookFormat> = {
  pdf: "PDF",
  epub: "EPUB",
  mobi: "MOBI",
  cbz: "CBZ",
  cbr: "CBR",
  txt: "TXT",
  md: "MD",
  markdown: "MD",
  docx: "DOCX",
  html: "HTML",
  htm: "HTML",
};

export function formatFromFilename(name: string): BookFormat | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_FORMAT[ext] ?? null;
}

/**
 * Ingestão: grava o binário, cria Book(PROCESSING) + UserBook e enfileira o job.
 * Retorna na hora — o trabalho pesado (parse/capa/OCR) roda no worker.
 */
export async function ingestUpload(params: {
  userId: string;
  filename: string;
  format: BookFormat;
  bytes: Buffer;
}) {
  const { userId, filename, format, bytes } = params;

  const contentHash = createHash("sha256").update(bytes).digest("hex");

  // Dedup por usuário: se ele já tem exatamente este arquivo, reaproveita o Book
  // (evita duplicar biblioteca). Casamento entre usuários fica p/ os Espaços.
  const existing = await prisma.userBook.findFirst({
    where: { userId, deletedAt: null, book: { contentHash } },
    include: { book: { include: { userBooks: true } } },
  });
  if (existing) return existing.book;

  const fileKey = `books/${randomUUID()}/${filename}`;
  await storage.put(fileKey, bytes);

  const book = await prisma.book.create({
    data: {
      title: stripExt(filename),
      format,
      fileKey,
      fileSize: BigInt(bytes.length),
      contentHash,
      status: "PROCESSING",
      userBooks: {
        create: { userId },
      },
    },
    include: { userBooks: true },
  });

  await enqueueDocument({ bookId: book.id, fileKey, format });

  return book;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}
