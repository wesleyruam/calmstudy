// Sidebar de navegação. Itens estáticos por enquanto; rotas reais na Fase 2.
const SECTIONS: { items: { icon: string; label: string; active?: boolean }[] }[] = [
  {
    items: [
      { icon: "📚", label: "Biblioteca", active: true },
      { icon: "🕓", label: "Continue Lendo" },
      { icon: "⭐", label: "Favoritos" },
      { icon: "📖", label: "Em Leitura" },
      { icon: "✅", label: "Concluídos" },
      { icon: "📥", label: "Importados" },
    ],
  },
  {
    items: [
      { icon: "🏷", label: "Tags" },
      { icon: "🗂", label: "Prateleiras" },
      { icon: "📝", label: "Anotações" },
      { icon: "📌", label: "Marcadores" },
      { icon: "🎯", label: "Metas" },
    ],
  },
  {
    items: [{ icon: "⚙", label: "Configurações" }],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-line)] px-3 py-6 md:block">
      <nav className="flex flex-col gap-6">
        {SECTIONS.map((section, i) => (
          <ul key={i} className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    item.active
                      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
                  ].join(" ")}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        ))}
      </nav>
    </aside>
  );
}
