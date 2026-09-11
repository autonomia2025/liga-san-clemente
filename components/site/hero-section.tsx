"use client";

import { useEffect, useRef } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";
import { Countdown } from "@/components/site/countdown";

// Hero de la Home. Entrada on-load con stagger (CSS .lbsc-fade-up). Imagen
// oficial con tratamiento del design system.
// Parallax leve SOLO en desktop y solo si no hay reduced-motion.
//
// El contenido viene por props porque el hero cambia de identidad cuando
// arrancan los playoffs: el acento pasa a dorado y el copy anuncia la
// definición del título. Quién decide el modo es la Home a partir del estado
// real de la temporada (lib/public/season-phase.ts) — acá no hay ninguna
// condición hardcodeada de fecha.

export type HeroMode = "regular" | "playoffs";

export type HeroCta = { label: string; href: string };

// Escudo de un equipo que sigue en carrera ("Quedan cuatro").
export type HeroTeam = { name: string; abbr: string; logoUrl?: string; color?: string };

export type HeroSectionProps = {
  mode?: HeroMode;
  kicker?: string;
  // El título se parte en dos líneas y la última palabra lleva el acento.
  titleLineOne?: string;
  titleLineTwo?: string;
  titleAccentWord?: string;
  subtitle?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  // Opcionales de playoffs: los escudos de los que siguen vivos y un contador
  // grande al próximo partido. Sin ellos el hero queda como siempre.
  teams?: HeroTeam[];
  countdownTarget?: string | null;
  countdownLabel?: string | null;
};

type HeroContenido = Required<
  Omit<HeroSectionProps, "mode" | "teams" | "countdownTarget" | "countdownLabel">
>;

const HERO_REGULAR: HeroContenido = {
  kicker: "Temporada 2026",
  titleLineOne: "Somos Liga.",
  titleLineTwo: "Somos",
  titleAccentWord: "Liga",
  subtitle:
    "8 equipos. Una sola pasión. La liga de básquetbol amateur que está transformando San Clemente.",
  primaryCta: { label: "Ver Calendario", href: "/calendario" },
  secondaryCta: { label: "Conoce la Liga", href: "/#historia" },
};

const HERO_PLAYOFFS: HeroContenido = {
  kicker: "Estamos en Playoffs · Temporada 2026",
  titleLineOne: "Se define",
  titleLineTwo: "el",
  titleAccentWord: "título",
  subtitle:
    "Terminó la fase regular. Ocho equipos, eliminación directa y un solo campeón. Acá se decide todo.",
  primaryCta: { label: "Ver Bracket", href: "/playoffs" },
  secondaryCta: { label: "Ver Calendario", href: "/calendario" },
};

export function HeroSection({
  mode = "regular",
  teams = [],
  countdownTarget = null,
  countdownLabel = null,
  ...overrides
}: HeroSectionProps = {}) {
  const base = mode === "playoffs" ? HERO_PLAYOFFS : HERO_REGULAR;
  // Un override undefined no pisa el copy base (un spread directo sí lo haría).
  const definidos = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined));
  const contenido: HeroContenido = { ...base, ...definidos };
  const esPlayoffs = mode === "playoffs";
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (reduce || !desktop || !parallaxRef.current) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY * 0.15, 30); // máximo 30px
        if (parallaxRef.current) parallaxRef.current.style.transform = `translateY(${y}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="inicio"
      className="lbsc-anchor relative flex min-h-[85vh] items-center overflow-hidden pt-8 lg:grid lg:min-h-screen lg:grid-cols-[55%_45%] lg:items-stretch lg:pt-14"
    >
      {/* Imagen / bloque visual (fondo en mobile, columna derecha en desktop) */}
      <div className="absolute inset-0 lg:relative lg:col-start-2 lg:-ml-28">
        <div ref={parallaxRef} className="h-full w-full will-change-transform">
          <div className="lbsc-image-settle lbsc-photo-treatment h-full min-h-[85vh] w-full lg:min-h-full lg:scale-105 lg:[transform-origin:center]">
            <div
              className="absolute inset-0 bg-cover bg-center lg:bg-[position:center_center]"
              style={{ backgroundImage: "url('/hero-lbsc.webp')" }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-bg-base/20 lg:bg-[linear-gradient(90deg,var(--bg-base)_0%,rgba(10,14,26,0.94)_14%,rgba(10,14,26,0.66)_34%,rgba(10,14,26,0.18)_62%,transparent_84%)]"
              aria-hidden="true"
            />
            <div className="lbsc-noise" />
            <div className="lbsc-vignette" />
            {/* Overlay más oscuro en mobile para legibilidad del texto encima. */}
            <div className="absolute inset-0 bg-bg-base/70 lg:bg-transparent" />
          </div>
        </div>
      </div>

      {/* Texto / identidad */}
      <div className="lbsc-container relative z-10 flex flex-col items-start gap-6 pb-28 pt-20 lg:col-start-1 lg:row-start-1 lg:max-w-2xl lg:pb-0 lg:pt-0">
        <span
          className={`lbsc-fade-up font-body text-xs font-bold uppercase tracking-[0.28em] ${esPlayoffs ? "text-accent-gold" : "text-accent-orange"}`}
          style={{ animationDelay: "0ms" }}
        >
          {contenido.kicker}
        </span>

        <h1
          className="lbsc-fade-up font-head text-6xl uppercase leading-[0.9] tracking-tight text-text-primary sm:text-7xl lg:text-8xl"
          style={{ animationDelay: "100ms" }}
        >
          {contenido.titleLineOne}
          <br />
          {contenido.titleLineTwo}{" "}
          <span className={esPlayoffs ? "text-accent-gold" : "text-accent-purple"}>
            {contenido.titleAccentWord}
          </span>
        </h1>

        <p
          className="lbsc-fade-up max-w-md font-body text-base leading-relaxed text-text-secondary sm:text-lg"
          style={{ animationDelay: "200ms" }}
        >
          {contenido.subtitle}
        </p>

        {(teams.length > 0 || countdownTarget) && (
          <div className="lbsc-fade-up flex flex-col gap-6" style={{ animationDelay: "250ms" }}>
            {teams.length > 0 && (
              <ul className="flex flex-wrap items-start gap-3 sm:gap-4" aria-label="Equipos que siguen en carrera">
                {teams.map((t) => (
                  <li key={t.abbr} className="flex w-16 flex-col items-center gap-1.5 sm:w-[4.5rem]">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl font-head text-xs uppercase text-white ring-1 ring-accent-gold/30 sm:h-16 sm:w-16"
                      style={
                        t.logoUrl
                          ? { background: `rgba(255,255,255,0.05) center/76% no-repeat url(${t.logoUrl})` }
                          : { background: `linear-gradient(155deg, ${t.color ?? "#7c3aed"}, #0a0e1a 82%)` }
                      }
                      title={t.name}
                    >
                      {t.logoUrl ? "" : t.abbr}
                    </span>
                    <span className="w-full truncate text-center font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      {t.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {countdownTarget && (
              <div className="flex flex-col gap-2">
                {countdownLabel && (
                  <span className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-text-secondary">
                    {countdownLabel}
                  </span>
                )}
                <Countdown target={countdownTarget} size="lg" tone={esPlayoffs ? "gold" : "white"} />
              </div>
            )}
          </div>
        )}

        <div
          className="lbsc-fade-up flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <LbscButton
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => (window.location.href = contenido.primaryCta.href)}
          >
            {contenido.primaryCta.label}
          </LbscButton>
          <LbscButton
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => (window.location.href = contenido.secondaryCta.href)}
          >
            {contenido.secondaryCta.label}
          </LbscButton>
        </div>
      </div>
    </section>
  );
}
