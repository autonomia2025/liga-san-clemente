"use client";

import { useEffect, useState } from "react";

// Sección de auspiciadores. Preparada para recibir sponsors por props; por
// ahora mocks desde app/page.tsx (NO conectada a DB). Apoya, no protagoniza:
// tono sobrio, sin grid de cards blancas ni bloque publicitario invasivo.

export type SponsorTier = "main" | "support";

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
      className="block h-8 w-28"
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
  const main = sponsors.find((s) => s.tier === "main");
  const support = sponsors.filter((s) => s.tier !== "main");

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

      {/* Auspiciador principal destacado */}
      {main && (
        <div className="mb-10 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-bg-elevated px-6 py-10 text-center">
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-gold">
            {main.label ?? "Auspiciador oficial"}
          </span>
          {main.logoUrl ? (
            <span
              className="block h-14 w-52"
              role="img"
              aria-label={main.name}
              style={{ backgroundImage: `url(${main.logoUrl})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
            />
          ) : (
            <span className="font-head text-4xl uppercase tracking-wide text-text-primary sm:text-5xl">{main.name}</span>
          )}
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
