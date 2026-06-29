/**
 * StorageProvider — abstração de armazenamento de arquivos.
 * Implementações: FilesystemStorage (dev) → S3Storage/MinIO (prod).
 * O domínio nunca sabe onde o byte mora.
 */
export interface StorageProvider {
  /** Persiste o conteúdo e retorna a chave (fileKey) para recuperá-lo. */
  put(key: string, data: Buffer | ReadableStream, contentType?: string): Promise<void>;

  /** Lê o conteúdo de uma chave. */
  get(key: string): Promise<Buffer>;

  /** Remove o arquivo. */
  delete(key: string): Promise<void>;

  /** URL temporária assinada para o cliente baixar/renderizar (expira). */
  signedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
