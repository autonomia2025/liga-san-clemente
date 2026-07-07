"use client";

import { useEffect, useState } from "react";

// Sección de auspiciadores. Preparada para recibir sponsors por props; por
// ahora mocks desde app/page.tsx (NO conectada a DB). Apoya, no protagoniza:
// tono sobrio, sin grid de cards blancas ni bloque publicitario invasivo.

// "destacado": auspiciadores que aportan más y deben resaltar un poco más
// (logo/nombre más grande, tarjeta propia) — puede haber varios, no solo uno.
// "support": el resto, tratamiento chico igual que siempre.
export type SponsorTier = "destacado" | "support";

export type Sponsor = {
  name: string;
  logoUrl?: string;
  href?: string;
  tier?: SponsorTier;
  label?: string;
};

export type SponsorsSectionProps = {
  sponsors: Sponsor[];
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduce;
}

function SponsorMark({ sponsor }: { sponsor: Sponsor }) {
  const content = sponsor.logoUrl ? (
    <span
      className="block h-14 w-44 sm:h-16 sm:w-52"
      role="img"
      aria-label={sponsor.name}
      style={{
        backgroundImage: `url(${sponsor.logoUrl})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  ) : (
    <span className="font-head text-xl uppercase tracking-wide text-text-primary">{sponsor.name}</span>
  );

  if (sponsor.href) {
    return (
      <a
        href={sponsor.href}
        aria-label={sponsor.name}
        className="lbsc-sponsor inline-flex items-center px-2 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
      >
        {content}
      </a>
    );
  }
  return <span className="lbsc-sponsor inline-flex items-center px-2">{content}</span>;
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  const reduce = usePrefersReducedMotion();
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
          resto (tarjeta propia, logo/nombre más grande) — sin ser un bloque
          publicitario invasivo, mismo tono sobrio que el resto de la sección. */}
      {destacados.length > 0 && (
        <div className="mb-10 flex flex-wrap items-stretch justify-center gap-4">
          {destacados.map((s, i) => {
            const card = (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-bg-elevated px-8 py-8 text-center transition-colors hover:border-accent-gold/30">
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-gold">
                  {s.label ?? "Auspiciador destacado"}
                </span>
                {s.logoUrl ? (
                  <span
                    className="block h-20 w-64 sm:h-24 sm:w-72"
                    role="img"
                    aria-label={s.name}
                    style={{ backgroundImage: `url(${s.logoUrl})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
                  />
                ) : (
                  <span className="font-head text-3xl uppercase tracking-wide text-text-primary sm:text-4xl">{s.name}</span>
                )}
              </div>
            );
            return s.href ? (
              <a
                key={`${s.name}-${i}`}
                href={s.href}
                aria-label={s.name}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
              >
                {card}
              </a>
            ) : (
              <div key={`${s.name}-${i}`}>{card}</div>
            );
          })}
        </div>
      )}

      {/* Resto de auspiciadores: desktop en fila con wrap. */}
      {support.length > 0 && (
        <>
          <div className="hidden flex-wrap items-center justify-center gap-x-10 gap-y-6 lg:flex">
            {support.map((s, i) => (
              <SponsorMark key={`${s.name}-${i}`} sponsor={s} />
            ))}
          </div>

          {/* Mobile: marquee (o grid estático si reduced-motion). */}
          {reduce ? (
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 lg:hidden">
              {support.map((s, i) => (
                <SponsorMark key={`${s.name}-${i}`} sponsor={s} />
              ))}
            </div>
          ) : (
            <div className="lbsc-marquee overflow-hidden lg:hidden" aria-hidden="false">
              <div className="lbsc-marquee-track">
                {/* Lista duplicada para loop sin salto. */}
                {[...support, ...support].map((s, i) => (
                  <span key={`${s.name}-${i}`} className="mx-6 flex items-center">
                    <SponsorMark sponsor={s} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
