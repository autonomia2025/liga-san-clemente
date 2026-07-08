// Sección de auspiciadores — franja horizontal rotativa (marquee) con todos
// los sponsors en pills compactas. Reemplaza la versión anterior (cards
// grandes + grid separado en destacados/secundarios), que quedó "pesada" y
// tipo catálogo — acá es una sola franja continua, look premium/deportivo.
//
// Server component: el movimiento, la pausa en hover/focus y el respeto a
// prefers-reduced-motion son 100% CSS (ver .lbsc-sponsor-marquee* en
// globals.css) — no hace falta "use client" para nada de esto.

export type SponsorTier = "destacado" | "support";

export type Sponsor = {
  name: string;
  logoUrl?: string;
  href?: string;
  // Ya no separa layouts (todo va en la misma franja) — solo decide el
  // orden: destacados primero, ver sortSponsors().
  tier?: SponsorTier;
  label?: string;
  // Logos claros/plateados que se lavarían contra el fondo off-white del
  // logo box (ej. Lever and Murphy Co., emblema metálico) — usan una caja
  // oscura en su lugar. Default false: la mayoría son oscuros/de color y
  // necesitan la caja clara, no al revés.
  lightLogo?: boolean;
};

export type SponsorsSectionProps = {
  sponsors: Sponsor[];
};

function sortSponsors(sponsors: Sponsor[]): Sponsor[] {
  return [...sponsors].sort((a, b) => {
    const pa = a.tier === "destacado" ? 0 : 1;
    const pb = b.tier === "destacado" ? 0 : 1;
    return pa - pb;
  });
}

function SponsorPill({ sponsor }: { sponsor: Sponsor }) {
  const content = (
    <div className="flex h-24 min-w-[180px] items-center justify-center rounded-2xl border border-white/10 bg-bg-elevated p-3 sm:h-[110px] sm:min-w-[220px] sm:p-4">
      <div
        className={`flex h-[60px] w-full items-center justify-center rounded-xl px-4 sm:h-[72px] ${
          sponsor.lightLogo ? "bg-slate-950/85" : "bg-[#F5F2EA]"
        }`}
      >
        {sponsor.logoUrl ? (
          <img src={sponsor.logoUrl} alt={sponsor.name} className="h-full w-auto max-w-full object-contain" />
        ) : (
          <span className="font-head text-sm uppercase tracking-wide text-text-primary">{sponsor.name}</span>
        )}
      </div>
    </div>
  );

  return sponsor.href ? (
    <a
      href={sponsor.href}
      aria-label={sponsor.name}
      className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
    >
      {content}
    </a>
  ) : (
    <div className="shrink-0">{content}</div>
  );
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  const ordenados = sortSponsors(sponsors);

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

      {/* Franja rotativa: overflow-hidden solo acá (nunca en la página).
          Lista real + lista duplicada aria-hidden para el loop sin salto —
          separadas en dos grupos (no una lista concatenada) para que un
          lector de pantalla no lea los sponsors dos veces. Pausa en
          hover/focus y respeta prefers-reduced-motion vía CSS puro (ver
          globals.css); bajo reduced motion la animación se detiene y la
          franja pasa a scroll horizontal manual en vez de quedar cortada. */}
      {ordenados.length > 0 && (
        <div className="lbsc-sponsor-marquee overflow-hidden">
          <div className="lbsc-sponsor-marquee-track flex items-center gap-4">
            <div className="flex shrink-0 items-center gap-4">
              {ordenados.map((s, i) => (
                <SponsorPill key={`real-${s.name}-${i}`} sponsor={s} />
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-4" aria-hidden="true">
              {ordenados.map((s, i) => (
                <SponsorPill key={`dup-${s.name}-${i}`} sponsor={s} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
