"use client";

import { useEffect, useRef, useState } from "react";
import { TeamChip } from "@/components/design-system/team-chip";

// Tabla de posiciones resumida para la Home. Preparada para recibir datos por
// props; por ahora se alimenta con mocks desde app/page.tsx (NO conectada a DB
// ni a la lógica real de standings). No es una tabla HTML tipo Excel: son filas
// tipo marcador físico.

export type StreakType = "win" | "loss" | null;

export type StandingPreviewTeam = {
  position: number;
  team: {
    name: string;
    abbr: string;
    logoUrl?: string;
    color?: string;
  };
  played: number;
  wins: number;
  losses: number;
  pointDiff: number;
  tablePoints: number;
  streak?: StreakType;
};

export type StandingsPreviewProps = {
  teams: StandingPreviewTeam[];
  seasonLabel?: string;
  title?: string;
  href?: string;
};

function StreakDots({ streak }: { streak?: StreakType }) {
  if (!streak) return null;
  const color = streak === "win" ? "bg-success" : "bg-live-pulse";
  return (
    <span
      className="flex items-center gap-1"
      aria-label={streak === "win" ? "Racha ganadora" : "Racha perdedora"}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${color}`} />
      ))}
    </span>
  );
}

function diffText(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

export function StandingsPreview({
  teams,
  seasonLabel = "TEMPORADA 2026",
  title = "TABLA DE POSICIONES",
  href = "/tabla",
}: StandingsPreviewProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window) || !listRef.current) return;
    setArmed(true);
    const el = listRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    // Fallback de seguridad: si el observer no dispara, revelar igual.
    const t = setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <section id="tabla" className="lbsc-anchor lbsc-container lbsc-section-tight">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-2">
          <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-purple">
            {seasonLabel}
          </span>
          <h2 className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
            {title}
          </h2>
        </div>
        <a
          href={href}
          className="group inline-flex items-center gap-1.5 font-body text-sm font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:text-accent-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Ver tabla completa
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
      </div>

      {/* Filas tipo marcador (ol/li, no tabla Excel) */}
      <ol ref={listRef} className="overflow-hidden rounded-2xl bg-bg-base ring-1 ring-white/[0.06]">
        {teams.map((t, i) => {
          const esLider = t.position === 1;
          return (
            <li
              key={t.position}
              className={`lbsc-srow relative border-t border-bg-elevated first:border-t-0 ${armed ? "lbsc-srow--armed" : ""} ${inView ? "lbsc-srow--in" : ""} ${esLider ? "lbsc-srow--lead" : ""}`}
              style={{ "--srow-delay": `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="lbsc-srow-body flex min-h-[56px] items-center gap-3 px-3 py-2.5 sm:px-5">
                {/* Posición */}
                <span
                  className={`shrink-0 text-center font-head leading-none tabular-nums ${
                    esLider ? "w-9 text-3xl text-accent-gold sm:text-4xl" : "w-8 text-2xl text-text-secondary sm:text-3xl"
                  }`}
                >
                  {t.position}
                </span>

                {/* Equipo + racha + (mobile) stats en 2da línea */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <TeamChip name={t.team.name} abbr={t.team.abbr} logoUrl={t.team.logoUrl} color={t.team.color} />
                    <StreakDots streak={t.streak} />
                  </div>
                  <span className="font-body text-[11px] uppercase tracking-wide text-text-secondary sm:hidden">
                    PJ {t.played} · {t.wins}-{t.losses}
                    {t.pointDiff !== 0 ? ` · ${diffText(t.pointDiff)}` : ""}
                  </span>
                </div>

                {/* Stats desktop (PJ / G-P / DIF) */}
                <div className="hidden items-center gap-5 font-body text-xs uppercase tracking-wide text-text-secondary sm:flex">
                  <span>
                    PJ <span className="font-mono text-text-primary">{t.played}</span>
                  </span>
                  <span>
                    G-P <span className="font-mono text-text-primary">{t.wins}-{t.losses}</span>
                  </span>
                  <span className={`font-mono ${t.pointDiff < 0 ? "text-live-pulse" : "text-text-secondary"}`}>
                    {diffText(t.pointDiff)}
                  </span>
                </div>

                {/* Indicador principal: PTS */}
                <div className="flex shrink-0 flex-col items-end">
                  <span className="font-head text-2xl leading-none tabular-nums text-text-primary sm:text-3xl">
                    {t.tablePoints}
                  </span>
                  <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                    PTS
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
