export type ArtifactType = "SUMMARY" | "GLOSSARY" | "CONCEPT" | "REFERENCE" | "EXERCISE";

export const ARTIFACT_TYPES: ArtifactType[] = ["SUMMARY", "GLOSSARY", "CONCEPT", "REFERENCE", "EXERCISE"];

export const ARTIFACT_META: Record<
  ArtifactType,
  { label: string; group: string; titlePlaceholder: string; bodyPlaceholder: string }
> = {
  SUMMARY: { label: "Resumo", group: "Resumos por capítulo", titlePlaceholder: "Capítulo / seção", bodyPlaceholder: "Resumo colaborativo…" },
  GLOSSARY: { label: "Termo", group: "Glossário", titlePlaceholder: "Termo", bodyPlaceholder: "Definição…" },
  CONCEPT: { label: "Conceito", group: "Conceitos importantes", titlePlaceholder: "Conceito", bodyPlaceholder: "Explicação…" },
  REFERENCE: { label: "Referência", group: "Referências externas", titlePlaceholder: "Título", bodyPlaceholder: "Link e/ou descrição…" },
  EXERCISE: { label: "Exercício", group: "Exercícios", titlePlaceholder: "Enunciado curto", bodyPlaceholder: "Detalhes / resolução…" },
};

export interface ArtifactDTO {
  id: string;
  type: ArtifactType;
  title: string;
  contentText: string;
  updatedByName: string | null;
  updatedAt: string;
  revisionCount: number;
  canDelete: boolean;
}

export interface ArtifactRevisionDTO {
  id: string;
  editorName: string | null;
  title: string;
  contentText: string;
  editedAt: string;
}
