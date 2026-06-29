import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CalmBook — sua biblioteca digital",
  description:
    "Leitura, estudo e organização. Notion + Kindle + Apple Books + Obsidian para sua biblioteca pessoal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
