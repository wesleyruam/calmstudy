import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageProvider } from "@calmstudy/core";

/**
 * StorageProvider em filesystem — para desenvolvimento.
 * Em produção troca-se por S3Storage/MinIO sem tocar no domínio.
 * Os bytes ficam em STORAGE_DIR; signedUrl aponta para a rota /api/files do web.
 */
export class FilesystemStorage implements StorageProvider {
  private readonly root: string;

  constructor(root = process.env.STORAGE_DIR ?? "./storage") {
    this.root = resolve(root);
  }

  private path(key: string): string {
    // impede path traversal (../) na chave
    const safe = key.replace(/\.\.(\/|\\)/g, "").replace(/^[/\\]+/, "");
    return join(this.root, safe);
  }

  async put(key: string, data: Buffer | ReadableStream): Promise<void> {
    const buf = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buf);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async signedUrl(key: string): Promise<string> {
    // Dev: a rota /api/files serve o arquivo. Em prod seria uma URL S3 assinada.
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}
