export type SpaceRole = "OWNER" | "MODERATOR" | "MEMBER" | "VIEWER";

export const ROLE_LABEL: Record<SpaceRole, string> = {
  OWNER: "Dono",
  MODERATOR: "Moderador",
  MEMBER: "Membro",
  VIEWER: "Leitor",
};

/** Papéis que podem convidar/moderar. */
export function canManage(role: SpaceRole): boolean {
  return role === "OWNER" || role === "MODERATOR";
}

export interface SpaceListItem {
  id: string;
  name: string;
  bookTitle: string;
  bookCover: string | null;
  memberCount: number;
  myRole: SpaceRole;
}

export interface SpaceMemberDTO {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: SpaceRole;
  shareProgress: boolean;
  progress: number | null; // null = não compartilha progresso
}

export interface SpaceObjectiveDTO {
  id: string;
  text: string;
  done: boolean;
}

export interface SpaceInviteDTO {
  code: string;
  role: SpaceRole;
}

export interface SpaceDetail {
  id: string;
  name: string;
  description: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  book: { userBookId: string | null; title: string; author: string | null; cover: string | null };
  myRole: SpaceRole;
  myShareProgress: boolean;
  members: SpaceMemberDTO[];
  objectives: SpaceObjectiveDTO[];
  invites: SpaceInviteDTO[]; // vazio p/ quem não pode gerenciar
}
