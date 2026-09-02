"use client";

import Link from "next/link";
import { LiveBadge } from "@/components/design-system/live-badge";
import { useCountdown } from "@/hooks/use-countdown";

// Franja de playoffs de la Home: los cuatro cruces de la ronda en curso con
// un contador regresivo al próximo partido. Es lo que hace que alguien que
// entra a la home entienda en dos segundos que la liga cambió de etapa.
//
// Recibe datos ya normalizados (no importa playoffs-data.ts) para que este
// componente siga siendo client sin arrastrar prisma al bundle.

export type PlayoffStripTeam = {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
  seed: number;
};

export type PlayoffStripMatch = {
  key: string;
  partidoId: string | null;
  home: PlayoffStripTeam | null;
  away: PlayoffStripTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "pending" | "scheduled" | "live" | "finished";
  scheduledAt: string | null;
  ganadorAbbr: string | null;
};

export type PlayoffsStripProps = {
  // "Cuartos de Final", "Semifinales", etc.
  rondaLabel: string;
  matches: PlayoffStripMatch[];
  // Instante del próximo partido no jugado; null si ya arrancaron todos.
  proximoAt: string | null;
};

const TIME_ZONE = "America/Santiago";

// Zona horaria explícita: sin esto, un visitante fuera de Chile vería la hora
// de su propio huso y creería que el partido es a otra hora.
const horaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function Escudo({ team }: { team: PlayoffStripTeam }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-head text-[10px] uppercase leading-none text-white ring-1 ring-white/10"
      style={
        team.logoUrl
          ? { background: `rgba(255,255,255,0.05) center/contain no-repeat url(${team.logoUrl})` }
          : { background: `linear-gradient(155deg, ${team.color ?? "#7c3aed"}, #0a0e1a 82%)` }
      }
      aria-hidden={team.logoUrl ? true : undefined}
    >
      {team.logoUrl ? "" : team.abbr}
    </span>
  );
}

function FilaEquipo({
  team,
  score,
  ganador,
}: {
  team: PlayoffStripTeam | null;
  score: number | null;
  ganador: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="h-8 w-8 shrink-0 rounded-lg border border-dashed border-white/15" aria-hidden="true" />
        <span className="font-body text-xs uppercase tracking-wide text-text-secondary/70">Por definir</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-3 shrink-0 text-center font-mono text-[10px] tabular-nums text-text-secondary">
        {team.seed}
      </span>
      <Escudo team={team} />
      <span
        className={`min-w-0 flex-1 truncate font-head text-sm uppercase leading-none tracking-tight ${ganador ? "text-accent-gold" : "text-text-primary"}`}
      >
        {team.name}
      </span>
      {score != null && (
        <span
          className={`shrink-0 font-head text-lg leading-none tabular-nums ${ganador ? "text-accent-gold" : "text-text-primary"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function CruceCard({ match }: { match: PlayoffStripMatch }) {
  const cuerpo = (
    <div className="flex h-full flex-col justify-center gap-2 rounded-xl border border-white/10 bg-bg-elevated px-3 py-3 transition-colors hover:border-accent-gold/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          {match.status === "finished"
            ? "Final"
            : match.scheduledAt
              ? horaFormatter.format(new Date(match.scheduledAt)).replace(/\./g, "")
              : "Por programar"}
        </span>
        {match.status === "live" && <LiveBadge />}
      </div>
      <FilaEquipo
        team={match.home}
        score={match.homeScore}
        ganador={match.ganadorAbbr != null && match.ganadorAbbr === match.home?.abbr}
      />
      <FilaEquipo
        team={match.away}
        score={match.awayScore}
        ganador={match.ganadorAbbr != null && match.ganadorAbbr === match.away?.abbr}
      />
    </div>
  );

  return match.partidoId ? (
    <Link href={`/partido/${match.partidoId}`} className="block h-full">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}

function Countdown({ target }: { target: string }) {
  const cd = useCountdown(target);
  const celdas = [
    { valor: cd ? pad(cd.d) : "--", label: "Días" },
    { valor: cd ? pad(cd.h) : "--", label: "Hrs" },
    { valor: cd ? pad(cd.m) : "--", label: "Min" },
    { valor: cd ? pad(cd.s) : "--", label: "Seg" },
  ];
  return (
    <div className="flex items-end gap-1.5" aria-live="polite">
      {celdas.map((c, i) => (
        <div key={c.label} className="flex items-end">
          <div className="flex flex-col items-center">
            <span className="font-head text-2xl leading-none tabular-nums text-accent-gold sm:text-3xl">
              {c.valor}
            </span>
            <span className="mt-1 font-body text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
              {c.label}
            </span>
          </div>
          {i < celdas.length - 1 && (
            <span className="px-0.5 font-head text-xl leading-none text-text-secondary sm:text-2xl">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function PlayoffsStrip({ rondaLabel, matches, proximoAt }: PlayoffsStripProps) {
  if (matches.length === 0) return null;

  return (
    <section id="playoffs" className="lbsc-anchor lbsc-container lbsc-section-tight">
      <div className="relative overflow-hidden rounded-2xl border border-accent-gold/25 bg-bg-base p-5 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(251,191,36,0.13), transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-body text-[11px] font-bold uppercase tracking-[0.28em] text-accent-gold">
              Estamos en Playoffs
            </span>
            <h2 className="mt-2 font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
              {rondaLabel}
            </h2>
          </div>
          {proximoAt && <Countdown target={proximoAt} />}
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {matches.map((m) => (
            <CruceCard key={m.key} match={m} />
          ))}
        </div>

        <div className="relative mt-5">
          <Link
            href="/playoffs"
            className="inline-flex rounded-lg border border-accent-gold/30 bg-accent-gold/[0.06] px-4 py-2 font-body text-sm font-semibold uppercase tracking-wide text-accent-gold transition-colors hover:bg-accent-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold"
          >
            Ver bracket completo →
          </Link>
        </div>
      </div>
    </section>
  );
}
