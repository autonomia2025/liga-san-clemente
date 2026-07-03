"use client";

import { useEffect, useRef, useState } from "react";

// Grid de equipos de la Home: "pared de escudos" / mural deportivo, no un
// catálogo de cards. Preparado para recibir datos por props; por ahora se
// alimenta con mocks desde app/page.tsx (NO conectado a DB).

export type TeamGridItem = {
  name: string;
  slug: string;
  abbr: string;
  logoUrl?: string;
  accentColor: string;
  currentPosition?: number | null;
  tablePoints?: number | null;
};

export type TeamsGridProps = {
  teams: TeamGridItem[];
};

function microDato(t: TeamGridItem): string {
  if (t.currentPosition != null) return `${t.currentPosition}° Lugar`;
  if (t.tablePoints != null) return `${t.tablePoints} PTS`;
  return "Temporada 2026";
}

export function TeamsGrid({ teams }: TeamsGridProps) {
  const gridRef = useRef<HTMLUListElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window) || !gridRef.current) return;
    setArmed(true);
    const el = gridRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <section id="equipos" className="lbsc-anchor lbsc-container lbsc-section-tight">
      <div className="mb-8 flex flex-col gap-2">
        <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
          8 equipos · una sola pasión
        </span>
        <h2 className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
          Los equipos de la liga
        </h2>
      </div>

      {/* Textura muy sutil detrás del grid (contenedor relative para el noise). */}
      <div className="relative">
        <div className="lbsc-noise" style={{ opacity: 0.03 }} />
        <ul ref={gridRef} className="relative grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-y-10 lg:grid-cols-4">
          {teams.map((t, i) => {
            // Mosaico diagonal: el grupo = fila + columna. Delays distintos para
            // 2 columnas (mobile) y 4 columnas (desktop), elegidos por CSS.
            const groupMobile = Math.floor(i / 2) + (i % 2);
            const groupDesktop = Math.floor(i / 4) + (i % 4);
            const style = {
              "--tg-accent": t.accentColor,
              "--tg-delay-m": `${groupMobile * 40}ms`,
              "--tg-delay-d": `${groupDesktop * 40}ms`,
            } as React.CSSProperties;
            return (
              <li
                key={t.slug}
                style={style}
                className={`lbsc-tg-item ${armed ? "lbsc-tg-item--armed" : ""} ${inView ? "lbsc-tg-item--in" : ""}`}
              >
                <a
                  href={`/equipo/${t.slug}`}
                  aria-label={`Ver ${t.name}`}
                  className="flex flex-col items-center gap-3 rounded-2xl p-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
                >
                  {t.logoUrl ? (
                    <span
                      className="lbsc-tg-shield block aspect-square w-20 rounded-[30%] bg-bg-elevated ring-1 ring-white/10 sm:w-24 lg:w-28"
                      role="img"
                      aria-label={t.name}
                      style={{
                        backgroundImage: `url(${t.logoUrl})`,
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  ) : (
                    <span
                      className="lbsc-tg-shield flex aspect-square w-20 items-center justify-center rounded-[30%] ring-1 ring-white/10 sm:w-24 lg:w-28"
                      style={{ background: `linear-gradient(155deg, ${t.accentColor}, #0a0e1a 82%)` }}
                    >
                      <span className="font-head text-2xl uppercase leading-none text-white sm:text-3xl">{t.abbr}</span>
                    </span>
                  )}

                  <span className="font-head text-sm uppercase leading-tight tracking-tight text-text-primary sm:text-base">
                    {t.name}
                  </span>

                  <span className="lbsc-tg-microdata font-body text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    {microDato(t)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
