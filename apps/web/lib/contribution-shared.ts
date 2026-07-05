export type ContributionKind = "QUESTION" | "COMMENT" | "ANSWER" | "NOTE";

export const KIND_LABEL: Record<ContributionKind, string> = {
  QUESTION: "Pergunta",
  COMMENT: "Comentário",
  ANSWER: "Resposta",
  NOTE: "Nota",
};

export interface ContributionAuthor {
  id: string;
  name: string | null;
}

export interface ContributionDTO {
  id: string;
  kind: ContributionKind;
  page: number | null;
  quotedText: string | null;
  contentText: string;
  author: ContributionAuthor;
  createdAt: string;
  canDelete: boolean;
  isPublic: boolean;
  canSetVisibility: boolean; // autor pode alternar espaço/público
  spaceName?: string | null; // preenchido na camada da comunidade
  reportCount?: number; // visível só p/ moderadores do espaço
  replies: ContributionDTO[];
}
