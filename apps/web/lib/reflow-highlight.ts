// Grifos em texto refluível (MOBI/EPUB). No PDF um destaque é geometria (retângulos
// sobre a página); aqui ancoramos por POSIÇÃO DE CARACTERE no texto do documento —
// estável mesmo que a fonte/coluna mude. Um destaque guarda { start, len } (offset
// dentro do textContent do artigo) e é renderizado envolvendo o intervalo em <mark>.

export interface TextAnchor {
  page: number; // página/capítulo visível na criação (exigido pela API)
  kind: "text";
  start: number; // offset de caractere no textContent do artigo
  len: number;
  chap?: number; // índice do capítulo (EPUB); ausente no MOBI (doc único)
}

export interface RenderableHighlight {
  id: string;
  start: number;
  len: number;
  color: string; // hex da categoria/cor
}

/**
 * Offset de caractere do limite (node, offset) dentro de `root`.
 * Mede via Range para funcionar tanto quando o limite cai num nó de texto quanto
 * num elemento (ex.: seleção por duplo-clique ou selectNodeContents, em que o
 * container é o próprio elemento e o offset é um índice de filho).
 */
export function offsetWithin(root: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(node, offset);
  } catch {
    return root.textContent?.length ?? 0;
  }
  return range.toString().length;
}

/** Lê a seleção atual se estiver contida em `root`; devolve texto + intervalo de offset. */
export function selectionRange(
  root: HTMLElement,
): { text: string; start: number; len: number; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const start = offsetWithin(root, range.startContainer, range.startOffset);
  const end = offsetWithin(root, range.endContainer, range.endOffset);
  const [a, b] = start <= end ? [start, end] : [end, start];
  const rect = range.getBoundingClientRect();
  return { text, start: a, len: b - a, rect };
}

/** Nó de texto + índice local que contêm o offset global dentro de `root`. */
export function nodeAtOffset(root: HTMLElement, offset: number): { node: Text; local: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let cur = walker.nextNode() as Text | null;
  while (cur) {
    const len = (cur.nodeValue ?? "").length;
    if (offset <= pos + len) return { node: cur, local: Math.max(0, offset - pos) };
    pos += len;
    cur = walker.nextNode() as Text | null;
  }
  return null;
}

/**
 * Índice da página (coluna) em que o offset cai, no modo página do MOBI.
 * O <article> é transladado, mas getBoundingClientRect devolve coords pós-transform
 * tanto do caractere quanto do artigo, então a diferença é a posição no fluxo de
 * colunas (= pág*step + deslocamento interno). `step` é a largura de uma página.
 */
export function pageOfOffset(article: HTMLElement, offset: number, step: number): number {
  if (step < 1) return 0;
  const at = nodeAtOffset(article, offset);
  if (!at) return 0;
  const range = document.createRange();
  const end = Math.min(at.local + 1, at.node.nodeValue?.length ?? at.local);
  try {
    range.setStart(at.node, at.local);
    range.setEnd(at.node, end);
  } catch {
    return 0;
  }
  const rects = range.getClientRects();
  const r = rects[0] ?? range.getBoundingClientRect();
  const a = article.getBoundingClientRect();
  return Math.max(0, Math.floor((r.left - a.left) / step));
}

/** Remove todos os <mark data-hl-id> criados por nós, restaurando o texto original. */
export function clearMarks(root: HTMLElement): void {
  root.querySelectorAll("mark[data-hl-id]").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
  root.normalize();
}

// bg translúcido a partir do hex da cor (mesmo tom das categorias).
function tint(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.32)`;
}

// Envolve o intervalo [start, start+len) do texto de `root` em <mark>.
function wrapRange(root: HTMLElement, hl: RenderableHighlight): void {
  const start = hl.start;
  const end = hl.start + hl.len;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  const pieces: { node: Text; from: number; to: number }[] = [];
  let cur = walker.nextNode() as Text | null;
  while (cur) {
    const len = (cur.nodeValue ?? "").length;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    if (nodeEnd > start && nodeStart < end && !isInsideMark(cur)) {
      pieces.push({
        node: cur,
        from: Math.max(0, start - nodeStart),
        to: Math.min(len, end - nodeStart),
      });
    }
    pos = nodeEnd;
    if (pos >= end) break;
    cur = walker.nextNode() as Text | null;
  }
  for (const { node, from, to } of pieces) {
    if (to <= from) continue;
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const mark = document.createElement("mark");
    mark.dataset.hlId = hl.id;
    mark.style.background = tint(hl.color);
    mark.style.color = "inherit";
    mark.style.borderRadius = "2px";
    mark.style.cursor = "pointer";
    mark.style.padding = "0 1px";
    try {
      range.surroundContents(mark);
    } catch {
      // intervalo cruza fronteira de elemento — ignora este pedaço
    }
  }
}

function isInsideMark(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p && p instanceof HTMLElement) {
    if (p.tagName === "MARK" && p.dataset.hlId) return true;
    p = p.parentNode;
  }
  return false;
}

/** Limpa e reaplica todos os destaques sobre o texto de `root`. */
export function applyHighlights(root: HTMLElement, highlights: RenderableHighlight[]): void {
  clearMarks(root);
  // aplica do fim para o começo para não deslocar offsets ao dividir nós de texto
  [...highlights]
    .sort((a, b) => b.start - a.start)
    .forEach((hl) => wrapRange(root, hl));
}
