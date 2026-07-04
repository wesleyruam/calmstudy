// Renderiza/extrai a capa de um documento. Roda SÓ no worker.
// PDF: renderiza a 1ª página (unpdf + @napi-rs/canvas).
// EPUB/CBZ: extrai a imagem de capa embutida (fflate). MOBI: header EXTH (best-effort).
// Tudo é normalizado para PNG (largura ~480) para casar com o pipeline (covers/${id}.png).
import { unzipSync } from "fflate";

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

// Redecodifica a imagem extraída (JPEG/PNG/…) e re-encoda como PNG, só reduzindo.
async function normalizeToPng(imgBytes: Buffer, targetWidth = 480): Promise<Buffer | null> {
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(imgBytes);
    const scale = Math.min(1, targetWidth / img.width);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toBuffer("image/png");
  } catch (e) {
    console.error("[cover] falha ao normalizar imagem de capa", e);
    return null;
  }
}

const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;

function decode(u8: Uint8Array): string {
  return new TextDecoder().decode(u8);
}

// Resolve caminho relativo dentro do zip (trata ./ e ../ e %20).
function resolveZipPath(base: string, href: string): string {
  const clean = decodeURIComponent(href.split("#")[0]!.split("?")[0]!);
  const parts = (base + clean).split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

// ─────────────────────────────── EPUB ───────────────────────────────

function extractEpubCoverBytes(bytes: Buffer): Buffer | null {
  const u8 = new Uint8Array(bytes);
  // Passo 1: só container.xml + .opf (arquivos pequenos).
  const meta = unzipSync(u8, {
    filter: (f) => f.name === "META-INF/container.xml" || f.name.toLowerCase().endsWith(".opf"),
  });

  let opfPath: string | undefined;
  const container = meta["META-INF/container.xml"];
  if (container) {
    const m = decode(container).match(/full-path=["']([^"']+)["']/i);
    if (m) opfPath = m[1];
  }
  if (!opfPath || !meta[opfPath]) {
    opfPath = Object.keys(meta).find((k) => k.toLowerCase().endsWith(".opf"));
  }
  const opfData = opfPath ? meta[opfPath] : undefined;
  if (!opfPath || !opfData) return null;

  const opf = decode(opfData);
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  let href: string | undefined;
  // a) <meta name="cover" content="ID"/> → manifest item por id
  const metaCover =
    opf.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i) ??
    opf.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']cover["']/i);
  if (metaCover) {
    const id = metaCover[1]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const item =
      opf.match(new RegExp(`<item[^>]*id=["']${id}["'][^>]*href=["']([^"']+)["']`, "i")) ??
      opf.match(new RegExp(`<item[^>]*href=["']([^"']+)["'][^>]*id=["']${id}["']`, "i"));
    if (item) href = item[1];
  }
  // b) properties="cover-image" (EPUB3)
  if (!href) {
    const item =
      opf.match(/<item[^>]*properties=["'][^"']*cover-image[^"']*["'][^>]*href=["']([^"']+)["']/i) ??
      opf.match(/<item[^>]*href=["']([^"']+)["'][^>]*properties=["'][^"']*cover-image[^"']*["']/i);
    if (item) href = item[1];
  }
  // c) fallback: manifesto com href de imagem contendo "cover"
  if (!href) {
    const item = opf.match(/<item[^>]*href=["']([^"']*cover[^"']*\.(?:jpe?g|png|gif|webp))["']/i);
    if (item) href = item[1];
  }
  if (!href) return null;

  const target = resolveZipPath(opfDir, href);
  // Passo 2: extrai só a imagem de capa.
  const img = unzipSync(u8, { filter: (f) => f.name === target });
  const data = img[target];
  return data ? Buffer.from(data) : null;
}

// ─────────────────────────────── CBZ ────────────────────────────────

function extractCbzCoverBytes(bytes: Buffer): Buffer | null {
  const u8 = new Uint8Array(bytes);
  // Passo 1: só lista nomes (filter retorna false → nada é descomprimido).
  const names: string[] = [];
  unzipSync(u8, {
    filter: (f) => {
      if (IMAGE_RE.test(f.name) && !f.name.startsWith("__MACOSX")) names.push(f.name);
      return false;
    },
  });
  if (names.length === 0) return null;
  const first = names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0]!;
  const out = unzipSync(u8, { filter: (f) => f.name === first });
  const data = out[first];
  return data ? Buffer.from(data) : null;
}

// ─────────────────────────────── MOBI ───────────────────────────────
// Best-effort: acha a capa via EXTH tipo 201 (CoverOffset), relativo ao 1º
// registro de imagem — que descobrimos escaneando magic bytes (offsets do
// header MOBI variam entre geradores). Qualquer falha → null (gradiente).

function isImageMagic(buf: Buffer, o: number): boolean {
  return (
    (buf[o] === 0xff && buf[o + 1] === 0xd8 && buf[o + 2] === 0xff) || // JPEG
    (buf[o] === 0x89 && buf[o + 1] === 0x50) || // PNG
    (buf[o] === 0x47 && buf[o + 1] === 0x49 && buf[o + 2] === 0x46) // GIF
  );
}

function extractMobiCoverBytes(buf: Buffer): Buffer | null {
  try {
    const numRecords = buf.readUInt16BE(76);
    if (numRecords < 2) return null;
    const recOffset = (i: number) => buf.readUInt32BE(78 + i * 8);
    const rec0 = recOffset(0);
    if (buf.toString("ascii", rec0 + 16, rec0 + 20) !== "MOBI") return null;

    // 1º registro de imagem: primeiro cujo conteúdo tem magic de imagem.
    let firstImage = -1;
    for (let i = 1; i < numRecords; i++) {
      if (isImageMagic(buf, recOffset(i))) {
        firstImage = i;
        break;
      }
    }
    if (firstImage < 0) return null;

    // EXTH (via magic, não via flag — offset da flag varia): tipo 201 = CoverOffset.
    let coverOffset = -1;
    const mobiHeaderLen = buf.readUInt32BE(rec0 + 20);
    const p = rec0 + 16 + mobiHeaderLen;
    if (buf.toString("ascii", p, p + 4) === "EXTH") {
      const exthCount = buf.readUInt32BE(p + 8);
      let q = p + 12;
      for (let i = 0; i < exthCount; i++) {
        const type = buf.readUInt32BE(q);
        const len = buf.readUInt32BE(q + 4);
        if (len < 8) break;
        if (type === 201) coverOffset = buf.readUInt32BE(q + 8);
        q += len;
      }
    }

    // Capa = 1ª imagem + coverOffset; se inválido/não-imagem, usa a 1ª imagem.
    let idx = coverOffset >= 0 ? firstImage + coverOffset : firstImage;
    if (idx >= numRecords || !isImageMagic(buf, recOffset(idx))) idx = firstImage;

    const start = recOffset(idx);
    const end = idx + 1 < numRecords ? recOffset(idx + 1) : buf.length;
    if (end <= start) return null;
    return buf.subarray(start, end);
  } catch {
    return null;
  }
}

// ───────────────────────────── dispatch ─────────────────────────────

export async function renderCover(format: string, bytes: Buffer): Promise<Buffer | null> {
  try {
    if (format === "PDF") return await renderPdfCover(bytes);

    let raw: Buffer | null = null;
    if (format === "EPUB") raw = extractEpubCoverBytes(bytes);
    else if (format === "CBZ") raw = extractCbzCoverBytes(bytes);
    else if (format === "MOBI") raw = extractMobiCoverBytes(bytes);

    return raw ? await normalizeToPng(raw) : null;
  } catch (e) {
    console.error(`[cover] falha ao extrair capa (${format})`, e);
    return null;
  }
}
