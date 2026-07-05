import type { Metadata } from "next";
import "./globals.css";
import { DialogProvider } from "@/components/dialog-provider";

export const metadata: Metadata = {
  title: "CalmStudy — sua biblioteca digital",
  description:
    "Leitura, estudo e organização. Notion + Kindle + Apple Books + Obsidian para sua biblioteca pessoal.",
};

// Aplica o tema salvo antes da pintura para não piscar (FOUC).
const themeScript = `(function(){try{var t=localStorage.getItem('calmstudy-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
