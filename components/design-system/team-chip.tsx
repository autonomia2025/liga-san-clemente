// Chip de equipo del design system LBSC (PR 4.2).
// Logo (o abreviatura si no hay logo) + nombre. Sin card pesada alrededor:
// compacto y deportivo, para fixture, marcador y resultados.

export function TeamChip({
  name,
  abbr,
  logoUrl,
  color,
  className = "",
}: {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
  className?: string;
}) {
  // Si hay logo se usa como fondo (contain, nunca cover, para no cortar el
  // escudo) sobre un lavado blanco tenue que le da contraste en fondo oscuro;
  // si no hay logo, el color de club (o un púrpura por defecto) detrás de la
  // abreviatura.
  const badgeStyle = logoUrl
    ? { background: `rgba(255,255,255,0.05) center/contain no-repeat url(${logoUrl})` }
    : { background: color ?? "linear-gradient(155deg, #7c3aed, #4c1d95)" };

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-head text-[11px] uppercase leading-none text-white ring-1 ring-white/10"
        style={badgeStyle}
      >
        {logoUrl ? "" : abbr}
      </span>
      <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">{name}</span>
    </span>
  );
}
