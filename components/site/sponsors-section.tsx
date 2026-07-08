// Sección de auspiciadores. Preparada para recibir sponsors por props; por
// ahora mocks desde app/page.tsx (NO conectada a DB). Apoya, no protagoniza:
// tono sobrio, sin bloque publicitario invasivo — pero los logos deben
// LEERSE bien, que es lo que esta versión corrige (antes: logos oscuros
// (Spalding, M&V) directo sobre fondo dark quedaban casi invisibles, y los
// secundarios se veían apagados en gris al 55% de opacidad + escala de
// grises permanente en mobile, donde nunca hay hover que los revele).
//
// Server component: ya no hace falta "use client" — el tratamiento anterior
// (marquee + fade a full color en hover) era la única razón para tener JS de
// cliente acá, y se reemplazó por una caja clara fija (sin animación) donde
// el logo siempre se ve a color y a opacidad plena.

// "destacado": auspiciadores que aportan más y deben resaltar un poco más
// (logo/nombre más grande, tarjeta propia) — puede haber varios, no solo uno.
// "support": el resto, en grid de mini-cards.
export type SponsorTier = "destacado" | "support";

export type Sponsor = {
  name: string;
  logoUrl?: string;
  href?: string;
  tier?: SponsorTier;
  label?: string;
  // Logos claros/plateados que se lavarían contra una caja blanca (ej. Lever
  // and Murphy Co., emblema metálico) — usan una caja oscura en vez de
  // blanca. Default false: la mayoría de los logos son oscuros/de color y
  // necesitan la caja clara, no al revés.
  lightLogo?: boolean;
};

export type SponsorsSectionProps = {
  sponsors: Sponsor[];
};

function SponsorLogoBox({ sponsor, className }: { sponsor: Sponsor; className: string }) {
  return (
    <div
      className={`flex w-full items-center justify-center rounded-xl p-4 ${
        sponsor.lightLogo ? "bg-slate-950/80" : "bg-white"
      } ${className}`}
    >
      {sponsor.logoUrl ? (
        <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full w-auto max-w-full object-contain" />
      ) : (
        <span className="font-head text-lg uppercase tracking-wide text-text-primary">{sponsor.name}</span>
      )}
    </div>
  );
}

function SponsorDestacadoCard({ sponsor }: { sponsor: Sponsor }) {
  const card = (
    <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-bg-elevated px-6 py-6 text-center transition-colors hover:border-accent-gold/30 sm:px-8 sm:py-8">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-gold">
        {sponsor.label ?? "Auspiciador destacado"}
      </span>
      <SponsorLogoBox sponsor={sponsor} className="h-28 sm:h-32" />
    </div>
  );

  return sponsor.href ? (
    <a
      href={sponsor.href}
      aria-label={sponsor.name}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
    >
      {card}
    </a>
  ) : (
    <div>{card}</div>
  );
}

function SponsorSupportCard({ sponsor }: { sponsor: Sponsor }) {
  const card = (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/20">
      <SponsorLogoBox sponsor={sponsor} className="h-20 sm:h-[88px]" />
    </div>
  );

  return sponsor.href ? (
    <a
      href={sponsor.href}
      aria-label={sponsor.name}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
    >
      {card}
    </a>
  ) : (
    <div>{card}</div>
  );
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  const destacados = sponsors.filter((s) => s.tier === "destacado");
  const support = sponsors.filter((s) => s.tier !== "destacado");

  return (
    <section id="auspiciadores" className="lbsc-container lbsc-section-tight">
      <div className="mb-8 flex flex-col gap-2">
        <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-purple">
          Gracias a nuestros auspiciadores
        </span>
        <h2 className="font-head text-2xl uppercase leading-none tracking-tight text-text-primary sm:text-3xl">
          Apoyan la temporada
        </h2>
      </div>

      {/* Auspiciadores destacados: aportan más, resaltan un poco más que el
          resto (tarjeta propia, caja clara para el logo, más grande) — sin
          ser un bloque publicitario invasivo, mismo tono sobrio del resto. */}
      {destacados.length > 0 && (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {destacados.map((s, i) => (
            <SponsorDestacadoCard key={`${s.name}-${i}`} sponsor={s} />
          ))}
        </div>
      )}

      {/* Resto de auspiciadores: grid de mini-cards, siempre a color y
          opacidad plena (antes: fila con opacidad 55% + escala de grises que
          solo se revelaba en hover — nunca en mobile, donde no hay hover). */}
      {support.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {support.map((s, i) => (
            <SponsorSupportCard key={`${s.name}-${i}`} sponsor={s} />
          ))}
        </div>
      )}
    </section>
  );
}
