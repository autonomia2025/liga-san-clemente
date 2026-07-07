"use client";

import { useEffect, useState } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";
import { LiveBadge } from "@/components/design-system/live-badge";
import { ScoreNumber } from "@/components/design-system/score-number";
import { clubLogoPad } from "@/lib/public/display";

// Módulo "Próximo Partido / En Vivo". Preparado para recibir datos por props;
// por ahora se alimenta con mocks desde app/page.tsx (NO conectado a DB).
// Los cambios de marcador en el estado live son una SIMULACIÓN visual (demo),
// no lógica final.

export type MatchState = "live" | "upcoming" | "none";

export type TeamInfo = {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
};

export type PlayerLeader = {
  name: string;
  initials: string;
  points: number;
  teamAbbr?: string;
};

export type MatchFeatureProps = {
  matchState: MatchState;
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
  homeScore?: number;
  awayScore?: number;
  periodLabel?: string;
  gameClock?: string;
  scheduledAt?: string | Date;
  venue?: string;
  leaders?: PlayerLeader[];
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduce;
}

/* ---- formateo local es-CL (sin tocar helpers públicos) ------------------- */

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatFechaLocal(fecha: string | Date, venue?: string): string {
  const d = new Date(fecha);
  const dia = capitalizar(d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }));
  const hora = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  return venue ? `${dia} · ${hora} · ${venue}` : `${dia} · ${hora}`;
}

/* ---- piezas visuales ----------------------------------------------------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function TeamColumn({ team, className = "" }: { team: TeamInfo; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl font-head text-base uppercase leading-none text-white ring-1 ring-white/10"
        style={
          team.logoUrl
            ? {
                backgroundColor: "rgba(255,255,255,0.05)",
                backgroundImage: `url(${team.logoUrl})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundOrigin: "content-box",
                padding: `${clubLogoPad(team.abbr, 6)}px`,
              }
            : { background: team.color ?? "linear-gradient(155deg,#7c3aed,#4c1d95)" }
        }
      >
        {team.logoUrl ? "" : team.abbr}
      </span>
      <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">{team.name}</span>
    </div>
  );
}

function LeaderChip({ leader }: { leader: PlayerLeader }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] font-head text-[11px] uppercase leading-none text-text-primary ring-1 ring-white/10">
        {leader.initials}
      </span>
      <span className="font-body text-[13px] font-medium uppercase tracking-wide text-text-secondary">{leader.name}</span>
      <span className="font-head text-base leading-none tracking-tight text-accent-gold">
        {leader.points}
        <span className="ml-1 font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary">pts</span>
      </span>
    </div>
  );
}

function BallCourtIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="14" stroke="currentColor" strokeWidth="1.6" className="text-text-secondary" />
      <path d="M28 14 V42 M14 28 H42 M18 18 C24 24 24 32 18 38 M38 18 C32 24 32 32 38 38" stroke="currentColor" strokeWidth="1.4" className="text-text-secondary" />
    </svg>
  );
}

/* ---- estados ------------------------------------------------------------- */

function LiveState({
  homeTeam,
  awayTeam,
  homeScore = 0,
  awayScore = 0,
  periodLabel,
  gameClock,
  leaders = [],
}: Required<Pick<MatchFeatureProps, "homeTeam" | "awayTeam">> &
  Pick<MatchFeatureProps, "homeScore" | "awayScore" | "periodLabel" | "gameClock" | "leaders">) {
  // Marcador REAL (props). No se simula: el flip/roll (key por valor) solo se
  // dispara si el marcador real cambia entre renders (ej. tras router.refresh).
  const home = homeScore;
  const away = awayScore;

  return (
    <div className="lbsc-live-glow rounded-2xl border border-accent-orange/25 bg-bg-elevated p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <LiveBadge />
        <span className="font-body text-sm font-bold uppercase tracking-wider text-text-primary">
          {periodLabel}
          {gameClock ? <span className="text-accent-orange"> · {gameClock}</span> : null}
        </span>
      </div>

      {/* Marcador tipo TV */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        <TeamColumn team={homeTeam} className="sm:flex-1 sm:items-end" />
        <div className="flex items-center gap-3 sm:gap-5" aria-label={`Marcador ${home} a ${away}`}>
          <span key={home} className="lbsc-score-roll">
            <ScoreNumber value={home} size="xl" accent={home >= away ? "gold" : "none"} />
          </span>
          <span className="font-head text-4xl leading-none text-text-secondary sm:text-5xl">-</span>
          <span key={away} className="lbsc-score-roll">
            <ScoreNumber value={away} size="xl" accent={away > home ? "gold" : "none"} />
          </span>
        </div>
        <TeamColumn team={awayTeam} className="sm:flex-1 sm:items-start" />
      </div>

      {/* Líderes */}
      {leaders.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-center sm:gap-8">
          {leaders.slice(0, 3).map((l) => (
            <LeaderChip key={`${l.initials}-${l.name}`} leader={l} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <LbscButton onClick={() => (window.location.href = "/en-vivo")}>Ver Boxscore Completo →</LbscButton>
      </div>
    </div>
  );
}

function UpcomingState({
  homeTeam,
  awayTeam,
  scheduledAt,
  venue,
}: Required<Pick<MatchFeatureProps, "homeTeam" | "awayTeam">> & Pick<MatchFeatureProps, "scheduledAt" | "venue">) {
  const [cd, setCd] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [fechaTexto, setFechaTexto] = useState("");

  useEffect(() => {
    if (!scheduledAt) return;
    setFechaTexto(formatFechaLocal(scheduledAt, venue));
    const target = new Date(scheduledAt).getTime();
    const tick = () => {
      const diff = Math.max(target - Date.now(), 0);
      let s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      s -= d * 86400;
      const h = Math.floor(s / 3600);
      s -= h * 3600;
      const m = Math.floor(s / 60);
      s -= m * 60;
      setCd({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt, venue]);

  const celdas: { valor: string; label: string }[] = [
    { valor: cd ? pad(cd.d) : "--", label: "Días" },
    { valor: cd ? pad(cd.h) : "--", label: "Horas" },
    { valor: cd ? pad(cd.m) : "--", label: "Min" },
    { valor: cd ? pad(cd.s) : "--", label: "Seg" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-8">
      <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-purple">Próximo partido</span>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        <TeamColumn team={homeTeam} className="sm:flex-1 sm:items-end" />
        <div className="flex items-end gap-2 sm:gap-3" aria-live="polite">
          {celdas.map((c, i) => (
            <div key={c.label} className="flex items-end">
              <div className="flex flex-col items-center">
                <span className="font-head text-4xl leading-none tracking-tight tabular-nums text-text-primary sm:text-5xl">
                  {c.valor}
                </span>
                <span className="mt-1.5 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                  {c.label}
                </span>
              </div>
              {i < celdas.length - 1 && (
                <span className="px-1 font-head text-3xl leading-none text-text-secondary sm:text-4xl">:</span>
              )}
            </div>
          ))}
        </div>
        <TeamColumn team={awayTeam} className="sm:flex-1 sm:items-start" />
      </div>

      {fechaTexto && (
        <p className="mt-6 text-center font-body text-sm text-text-secondary">{fechaTexto}</p>
      )}

      <div className="mt-8 flex justify-center">
        <LbscButton variant="secondary" onClick={() => (window.location.href = "/calendario")}>
          Ver Calendario Completo →
        </LbscButton>
      </div>
    </div>
  );
}

function NoneState() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-bg-elevated p-10 text-center">
      <BallCourtIcon />
      <p className="font-body text-base uppercase tracking-wide text-text-secondary">
        Sin partidos programados por el momento
      </p>
      <LbscButton variant="secondary" onClick={() => (window.location.href = "/tabla")}>
        Ver Tabla de Posiciones →
      </LbscButton>
    </div>
  );
}

/* ---- componente principal ------------------------------------------------ */

export function MatchFeature(props: MatchFeatureProps) {
  const { matchState, homeTeam, awayTeam } = props;
  const reduce = usePrefersReducedMotion();

  // Si faltan datos de equipos en live/upcoming no se puede armar el marcador,
  // así que se cae con gracia al estado "none".
  const tieneEquipos = Boolean(homeTeam && awayTeam);

  let contenido: React.ReactNode;
  if (matchState === "live" && tieneEquipos) {
    contenido = (
      <LiveState
        homeTeam={homeTeam!}
        awayTeam={awayTeam!}
        homeScore={props.homeScore}
        awayScore={props.awayScore}
        periodLabel={props.periodLabel}
        gameClock={props.gameClock}
        leaders={props.leaders}
      />
    );
  } else if (matchState === "upcoming" && tieneEquipos) {
    contenido = (
      <UpcomingState homeTeam={homeTeam!} awayTeam={awayTeam!} scheduledAt={props.scheduledAt} venue={props.venue} />
    );
  } else {
    contenido = <NoneState />;
  }

  return (
    <section id="en-vivo" className="lbsc-anchor lbsc-container lbsc-section-tight">
      <div key={matchState} className={reduce ? "" : "lbsc-cross-in"}>
        {contenido}
      </div>
    </section>
  );
}
