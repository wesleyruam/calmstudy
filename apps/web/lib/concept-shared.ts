// Tipos compartilhados servidor/cliente da base de conhecimento (E3).
import type { TiptapDoc } from "@/lib/note-shared";
import type { StudyHighlight } from "@/components/highlight-item";

export interface ConceptListItem {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  favorite: boolean;
  counts: { links: number; books: number; highlights: number; notes: number };
  updatedAt: string;
}

export interface ConceptLinkDTO {
  linkId: string;
  conceptId: string;
  title: string;
  label: string | null;
}

export interface ConceptBookDTO {
  userBookId: string;
  title: string;
}

export interface ConceptDetail {
  id: string;
  title: string;
  description: string | null;
  content: TiptapDoc;
  contentText: string | null;
  color: string | null;
  favorite: boolean;
  tags: string[];
  links: ConceptLinkDTO[];
  books: ConceptBookDTO[];
  highlights: StudyHighlight[];
  updatedAt: string;
}

// Nó/aresta para o mapa (grafo) — módulo 23.
export interface GraphNode {
  id: string;
  title: string;
  color: string | null;
  degree: number;
}
export interface GraphEdge {
  from: string;
  to: string;
  label: string | null;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
