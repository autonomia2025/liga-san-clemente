// Badge "EN VIVO" del design system LBSC (PR 4.2).
// Punto rojo con pulso animado (scale + opacity), texto compacto. El pulso
// respeta prefers-reduced-motion (definido en globals.css: .lbsc-live-dot).
// Usable en header, match center y scoreboard.

export function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-live-pulse/40 bg-live-pulse/10 px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-live-pulse ${className}`}
    >
      <span className="lbsc-live-dot h-1.5 w-1.5 rounded-full bg-live-pulse" aria-hidden="true" />
      En vivo
    </span>
  );
}
