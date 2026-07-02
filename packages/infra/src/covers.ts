import { FilesystemStorage } from "./storage/filesystem.js";

const storage = new FilesystemStorage();

export function coverKey(bookId: string): string {
  return `covers/${bookId}.png`;
}

/** Armazena a capa (PNG) e retorna a URL servível pelo /api/files. */
export async function storeCover(bookId: string, png: Buffer): Promise<string> {
  const key = coverKey(bookId);
  await storage.put(key, png);
  return storage.signedUrl(key);
}

/** Remove a capa (se existir). */
export async function deleteCover(bookId: string): Promise<void> {
  await storage.delete(coverKey(bookId)).catch(() => {});
}
