export interface PageLinkDTO {
  id: string;
  fromPage: number;
  toPage: number;
  label: string;
  createdAt: string;
}

interface PageLinkRow {
  id: string;
  fromPage: number;
  toPage: number;
  label: string;
  createdAt?: Date | string;
}

export function serializePageLink(l: PageLinkRow): PageLinkDTO {
  return {
    id: l.id,
    fromPage: l.fromPage,
    toPage: l.toPage,
    label: l.label,
    createdAt: new Date(l.createdAt ?? Date.now()).toISOString(),
  };
}
