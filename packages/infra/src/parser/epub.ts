import { unzipSync } from "fflate";
import type { DocumentParser, ParsedDocument, ParsedMetadata } from "@calmstudy/core";

/**
 * Parser de EPUB (roda SÓ no worker). Extrai metadata (título/autor/idioma/…)
 * e o texto dos capítulos (p/ a busca FTS). Sem DOM no Node → parsing por regex,
 * igual ao extrator de capa. O arquivo continua sendo renderizado no cliente
 * pelo leitor de EPUB; aqui só produzimos metadata + texto pesquisável.
 */
export class EpubParser implements DocumentParser {
  readonly supports = ["EPUB"] as const;

  async parse(data: Buffer): Promise<ParsedDocument> {
    const u8 = new Uint8Array(data);

    // Descompacta só o que interessa (container/opf/ncx + documentos de texto).
    const files = unzipSync(u8, {
      filter: (f) => {
        const n = f.name.toLowerCase();
        return (
          n === "meta-inf/container.xml" ||
          n.endsWith(".opf") ||
          n.endsWith(".ncx") ||
          /\.x?html?$/.test(n)
        );
      },
    });

    const container = fileCI(files, "META-INF/container.xml");
    let opfPath = container ? decode(container).match(/full-path=["']([^"']+)["']/i)?.[1] : undefined;
    if (!opfPath || !fileCI(files, opfPath)) {
      opfPath = Object.keys(files).find((k) => k.toLowerCase().endsWith(".opf"));
    }
    const opfData = opfPath ? fileCI(files, opfPath) : undefined;
    if (!opfPath || !opfData) {
      // Sem OPF: melhor devolver vazio a falhar (o leitor ainda abre o arquivo).
      return { text: "", pages: null, cover: null, metadata: {} };
    }

    const opf = decode(opfData);
    const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
    const metadata = extractMetadata(opf);

    // manifest: id → href
    const manifest = new Map<string, string>();
    for (const m of opf.matchAll(/<item\b[^>]*>/gi)) {
      const tag = m[0];
      const id = attr(tag, "id");
      const href = attr(tag, "href");
      if (id && href) manifest.set(id, href);
    }

    // spine: ordem de leitura → concatena o texto dos capítulos
    let text = "";
    for (const ref of opf.matchAll(/<itemref\b[^>]*>/gi)) {
      const idref = attr(ref[0], "idref");
      if (!idref) continue;
      const href = manifest.get(idref);
      if (!href) continue;
      const target = resolveZipPath(opfDir, href);
      const doc = fileCI(files, target);
      if (!doc) continue;
      const chunk = htmlToText(decode(doc));
      if (chunk) text += chunk + "\n\n";
      if (text.length > 1_200_000) break; // o worker corta em 1M; evita trabalho à toa
    }

    return { text: text.trim(), pages: null, cover: null, metadata };
  }
}

// ─────────────────────────────── helpers ───────────────────────────────

function decode(u8: Uint8Array): string {
  return new TextDecoder().decode(u8);
}

// Busca no zip tolerando diferença de caixa.
function fileCI(files: Record<string, Uint8Array>, path: string): Uint8Array | undefined {
  if (files[path]) return files[path];
  const lower = path.toLowerCase();
  const key = Object.keys(files).find((k) => k.toLowerCase() === lower);
  return key ? files[key] : undefined;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return m ? m[1] : undefined;
}

// Resolve caminho relativo dentro do zip (trata ./ e ../ e %20).
function resolveZipPath(base: string, href: string): string {
  const clean = decodeURIComponent(href.split("#")[0]!.split("?")[0]!);
  const stack: string[] = [];
  for (const part of (base + clean).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function tagText(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"));
  return m ? decodeEntities(m[1]!.replace(/<[^>]+>/g, "").trim()) || undefined : undefined;
}

function extractMetadata(opf: string): ParsedMetadata {
  // Restringe ao bloco <metadata> quando possível (evita casar itens do manifesto).
  const block = opf.match(/<metadata[\s\S]*?<\/metadata>/i)?.[0] ?? opf;
  const meta: ParsedMetadata = {};

  meta.title = tagText(block, "title");
  meta.author = tagText(block, "creator");
  meta.language = tagText(block, "language");
  meta.publisher = tagText(block, "publisher");
  meta.description = tagText(block, "description");

  const date = tagText(block, "date");
  const year = date?.match(/\b(\d{4})\b/)?.[1];
  if (year) meta.year = Number(year);

  // ISBN: algum <dc:identifier> com valor de ISBN (10/13 dígitos).
  for (const m of block.matchAll(/<(?:\w+:)?identifier\b[^>]*>([\s\S]*?)<\/(?:\w+:)?identifier>/gi)) {
    const raw = m[1]!.replace(/<[^>]+>/g, "").replace(/[\s-]/g, "");
    const isbn = raw.match(/(97[89]\d{10}|\d{9}[\dxX])$/)?.[1];
    if (isbn) {
      meta.isbn = isbn.toUpperCase();
      break;
    }
  }

  return meta;
}

// XHTML → texto plano (p/ FTS): tira script/style, quebra por blocos, decodifica.
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|br|section|article|tr|blockquote)>/gi, "\n")
      .replace(/<br\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}
