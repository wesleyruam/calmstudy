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

/** Loading calmo: o símbolo respirando + rótulo opcional. */
export function LoadingMark({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png"
        alt=""
        className={`size-12 animate-pulse select-none object-contain [animation-duration:1.8s] ${DARK}`}
      />
      {label && <p className="text-sm text-[var(--color-ink-soft)]">{label}</p>}
    </div>
  );
}
