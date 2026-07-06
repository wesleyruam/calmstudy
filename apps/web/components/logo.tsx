// Marca do CalmStudy. No tema escuro, um filtro clareia os traços (mesmo truque
// do PDF) para a arte navy continuar visível sobre o fundo escuro.
const DARK = "dark:[filter:invert(0.9)_hue-rotate(180deg)]";

/** Símbolo (livro) — navbar, favicon, loading. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark.png" alt="CalmStudy" className={`${className} select-none object-contain ${DARK}`} />
  );
}

/** Logo completa (símbolo + wordmark + tagline) — telas de marca. */
export function Logo({ className = "h-20" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.png" alt="CalmStudy" className={`${className} w-auto select-none object-contain ${DARK}`} />
  );
}

/** Loading: o símbolo (branco) num disco marrom, girando de leve e quicando. */
export function LoadingMark({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div
        className="calm-loading-badge grid size-16 place-items-center rounded-full shadow-[0_8px_20px_rgba(111,88,68,0.35)]"
        style={{ background: "#6f5844" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/mark.png"
          alt=""
          className="size-10 select-none object-contain [filter:brightness(0)_invert(1)]"
        />
      </div>
      {label && <p className="text-sm text-[var(--color-ink-soft)]">{label}</p>}
      <style>{`
        @keyframes calm-loading-badge {
          0%   { transform: translateY(0) rotate(-8deg); }
          50%  { transform: translateY(-18px) rotate(8deg); }
          100% { transform: translateY(0) rotate(-8deg); }
        }
        .calm-loading-badge { animation: calm-loading-badge 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .calm-loading-badge { animation: none; }
        }
      `}</style>
    </div>
  );
}
