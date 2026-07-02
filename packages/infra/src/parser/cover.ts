// Renderiza a capa (1ª página) de um documento. Roda SÓ no worker.
// PDF: usa unpdf + @napi-rs/canvas (binário prebuilt, sem compilar nada no sistema).
// EPUB/MOBI/etc: capa fica para depois (ficam com o gradiente do card).

export async function renderPdfCover(bytes: Buffer): Promise<Buffer | null> {
  try {
    const { renderPageAsImage } = await import("unpdf");
    // unpdf tipa `canvas` como node-canvas; o @napi-rs/canvas é compatível em runtime
    // (createCanvas/getContext/toDataURL) — cast localizado só para o TS.
    const opts = {
      width: 480,
      canvas: () => import("@napi-rs/canvas"),
    } as unknown as Parameters<typeof renderPageAsImage>[2];
    const png = await renderPageAsImage(new Uint8Array(bytes), 1, opts);
    return Buffer.from(png);
  } catch (e) {
    console.error("[cover] falha ao renderizar capa do PDF", e);
    return null;
  }
}

export async function renderCover(format: string, bytes: Buffer): Promise<Buffer | null> {
  if (format === "PDF") return renderPdfCover(bytes);
  return null;
}
