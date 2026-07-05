import { LoadingMark } from "@/components/logo";

// Tela de carregamento entre rotas (Next mostra durante a navegação).
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--color-paper)]">
      <LoadingMark />
    </div>
  );
}
