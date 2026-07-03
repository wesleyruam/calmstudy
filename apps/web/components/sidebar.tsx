import Link from "next/link";
import { getShelves } from "@/lib/shelves";
import { NewShelfButton } from "@/components/new-shelf-button";

const FILTERS: { href: string; icon: string; label: string; key: string }[] = [
  { href: "/", icon: "📚", label: "Biblioteca", key: "all" },
  { href: "/?filter=reading", icon: "📖", label: "Em Leitura", key: "reading" },
  { href: "/?filter=favorites", icon: "⭐", label: "Favoritos", key: "favorites" },
  { href: "/?filter=finished", icon: "✅", label: "Concluídos", key: "finished" },
  { href: "/?filter=recent", icon: "📥", label: "Importados", key: "recent" },
];

export async function Sidebar({
  activeFilter = "all",
  activeShelf,
}: {
  activeFilter?: string;
  activeShelf?: string;
}) {
  const shelves = await getShelves();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-line)] px-3 py-6 md:block">
      <nav className="flex flex-col gap-6">
        <ul className="flex flex-col gap-0.5">
          {FILTERS.map((item) => (
            <SideLink
              key={item.key}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={!activeShelf && activeFilter === item.key}
            />
          ))}
        </ul>

        <div>
          <div className="mb-1 px-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Estudo
            </span>
          </div>
          <ul className="flex flex-col gap-0.5">
            <SideLink href="/revisao" icon="🔁" label="Revisão" />
            <SideLink href="/conhecimento" icon="🧠" label="Conhecimento" />
            <SideLink href="/mapa" icon="🕸" label="Mapa" />
            <SideLink href="/estatisticas" icon="📊" label="Estatísticas" />
            <SideLink href="/favoritos" icon="⭐" label="Favoritos" />
            <SideLink href="/timeline" icon="🕒" label="Linha do tempo" />
          </ul>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
              Prateleiras
            </span>
            <NewShelfButton />
          </div>
          <ul className="flex flex-col gap-0.5">
            {shelves.length === 0 && (
              <li className="px-3 py-1.5 text-xs text-[var(--color-ink-soft)]">
                Nenhuma ainda.
              </li>
            )}
            {shelves.map((shelf) => (
              <SideLink
                key={shelf.id}
                href={`/?shelf=${shelf.id}`}
                icon={shelf.icon ?? "🗂"}
                label={shelf.name}
                count={shelf.count}
                active={activeShelf === shelf.id}
              />
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

function SideLink({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={[
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
          active
            ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
        ].join(" ")}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-[var(--color-ink-soft)]">{count}</span>
        )}
      </Link>
    </li>
  );
}
