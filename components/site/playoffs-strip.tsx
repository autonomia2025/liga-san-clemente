"use client";

import Link from "next/link";
import { LiveBadge } from "@/components/design-system/live-badge";
import { Countdown } from "@/components/site/countdown";

// Franja de playoffs de la Home: los cruces de la ronda en curso y, debajo y
// en segundo plano, la Copa de Plata. Con cuatro cruces (cuartos) se dibujan
// tarjetas compactas; con uno o dos (semis, final) cada cruce pasa a ser un
// "duelo" grande con escudos, que es lo que se tiene que ver primero.
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

// Copa de Plata: secundaria a propósito — una banda plateada al pie de la
// franja, sin escudos grandes ni contador.
export type PlayoffStripCopaPlata = {
  rondaLabel: string;
  matches: PlayoffStripMatch[];
  championName: string | null;
};

export type PlayoffsStripProps = {
  // "Cuartos de Final", "Semifinales", etc.
  rondaLabel: string;
  matches: PlayoffStripMatch[];
  // Instante del próximo partido no jugado; null oculta el contador (ya
  // arrancaron todos, o el hero de la home ya lo muestra en grande).
  proximoAt: string | null;
  copaPlata?: PlayoffStripCopaPlata | null;
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

const horaCortaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function hrefDe(match: PlayoffStripMatch): string | null {
  if (!match.partidoId) return null;
  return match.status === "live" ? "/en-vivo" : `/partido/${match.partidoId}`;
}

function esGanador(match: PlayoffStripMatch, team: PlayoffStripTeam | null): boolean {
  return team != null && match.ganadorAbbr != null && match.ganadorAbbr === team.abbr;
}

function Escudo({ team, grande = false }: { team: PlayoffStripTeam; grande?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-head uppercase leading-none text-white ring-1 ring-white/10 ${
        grande ? "h-16 w-16 rounded-2xl text-sm sm:h-20 sm:w-20" : "h-8 w-8 rounded-lg text-[10px]"
      }`}
      style={
        team.logoUrl
          ? { background: `rgba(255,255,255,0.05) center/${grande ? "78%" : "contain"} no-repeat url(${team.logoUrl})` }
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
      <FilaEquipo team={match.home} score={match.homeScore} ganador={esGanador(match, match.home)} />
      <FilaEquipo team={match.away} score={match.awayScore} ganador={esGanador(match, match.away)} />
    </div>
  );

  const href = hrefDe(match);
  return href ? (
    <Link href={href} className="block h-full">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}

// Un lado del duelo: escudo grande, nombre y siembra.
function LadoDuelo({ team, ganador, perdedor }: { team: PlayoffStripTeam | null; ganador: boolean; perdedor: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center ${perdedor ? "opacity-45" : ""}`}>
      {team ? (
        <Escudo team={team} grande />
      ) : (
        <span className="h-16 w-16 rounded-2xl border border-dashed border-white/15 sm:h-20 sm:w-20" aria-hidden="true" />
      )}
      <span
        className={`max-w-full truncate font-head text-lg uppercase leading-none tracking-tight sm:text-xl ${ganador ? "text-accent-gold" : "text-text-primary"}`}
      >
        {team?.name ?? "Por definir"}
      </span>
      {team && (
        <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          {team.seed}º fase regular
        </span>
      )}
    </div>
  );
}

function DueloCard({ match, etiqueta }: { match: PlayoffStripMatch; etiqueta: string }) {
  const conMarcador = (match.status === "finished" || match.status === "live") && match.homeScore != null && match.awayScore != null;
  const hora = match.scheduledAt ? horaCortaFormatter.format(new Date(match.scheduledAt)) : null;
  const decidido = match.ganadorAbbr != null;
  const accion =
    match.status === "live" ? "Seguir en vivo" : match.status === "finished" ? "Ver resultado" : "Ver la previa";

  const cuerpo = (
    <div
      className={`flex h-full flex-col gap-5 rounded-2xl border px-4 py-5 transition-colors sm:px-6 ${
        match.status === "live"
          ? "border-live-pulse/40 bg-live-pulse/[0.04]"
          : "border-accent-gold/20 bg-bg-elevated hover:border-accent-gold/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold">{etiqueta}</span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {match.status === "finished" ? "Final" : "Por jugarse"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <LadoDuelo
          team={match.home}
          ganador={esGanador(match, match.home)}
          perdedor={decidido && !esGanador(match, match.home)}
        />
        <div className="flex shrink-0 flex-col items-center">
          {conMarcador ? (
            <span className="font-head text-3xl leading-none tabular-nums text-text-primary sm:text-4xl">
              {match.homeScore}
              <span className="px-1.5 text-text-secondary">-</span>
              {match.awayScore}
            </span>
          ) : (
            <>
              <span className="font-head text-3xl leading-none tabular-nums text-text-primary sm:text-4xl">
                {hora ?? "VS"}
              </span>
              {hora && (
                <span className="mt-1 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                  hrs
                </span>
              )}
            </>
          )}
        </div>
        <LadoDuelo
          team={match.away}
          ganador={esGanador(match, match.away)}
          perdedor={decidido && !esGanador(match, match.away)}
        />
      </div>

      {match.partidoId && (
        <span className="self-center font-body text-xs font-semibold uppercase tracking-wide text-accent-gold">
          {accion} →
        </span>
      )}
    </div>
  );

  const href = hrefDe(match);
  return href ? (
    <Link
      href={href}
      className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold"
    >
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}

function CopaPlataBand({ copa }: { copa: PlayoffStripCopaPlata }) {
  return (
    <div className="relative mt-6 border-t border-white/10 pt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent-silver/70" aria-hidden="true" />
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-silver/90">
            {copa.rondaLabel}
          </span>
        </div>
        <ul className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
          {copa.matches.map((m) => {
            const href = hrefDe(m);
            const conMarcador = m.homeScore != null && m.awayScore != null && m.status !== "scheduled";
            const estado =
              m.status === "finished"
                ? "Final"
                : m.status === "live"
                  ? "En vivo"
                  : m.scheduledAt
                    ? horaCortaFormatter.format(new Date(m.scheduledAt))
                    : "Por programar";
            const contenido = (
              <>
                <span
                  className={`w-12 shrink-0 font-mono text-xs tabular-nums ${m.status === "live" ? "text-live-pulse" : "text-text-secondary/80"}`}
                >
                  {estado}
                </span>
                <span className={esGanador(m, m.home) ? "text-accent-silver" : "text-text-primary"}>
                  {m.home?.name ?? "Por definir"}
                </span>
                {conMarcador ? (
                  <span className="font-head tabular-nums text-text-primary">
                    {m.homeScore}-{m.awayScore}
                  </span>
                ) : (
                  <span className="text-text-secondary/60">vs</span>
                )}
                <span className={esGanador(m, m.away) ? "text-accent-silver" : "text-text-primary"}>
                  {m.away?.name ?? "Por definir"}
                </span>
              </>
            );
            return (
              <li key={m.key}>
                {href ? (
                  <Link href={href} className="flex items-center gap-2 font-body text-sm transition-opacity hover:opacity-80">
                    {contenido}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 font-body text-sm">{contenido}</span>
                )}
              </li>
            );
          })}
        </ul>
        {copa.championName && (
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-accent-silver">
            Campeón: {copa.championName}
          </span>
        )}
      </div>
    </div>
  );
}

export function PlayoffsStrip({ rondaLabel, matches, proximoAt, copaPlata = null }: PlayoffsStripProps) {
  if (matches.length === 0) return null;
  const modoDuelo = matches.length <= 2;
  // Con un solo cruce (la final) la tarjeta va centrada y no a media grilla.
  const etiquetaDuelo = matches.length === 1 ? "La Final" : "Semifinal";
  const grilla = !modoDuelo
    ? "sm:grid-cols-2 lg:grid-cols-4"
    : matches.length === 1
      ? "mx-auto w-full max-w-2xl"
      : "md:grid-cols-2 md:gap-4";

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

        <div
          className={`relative mt-6 grid grid-cols-1 gap-3 ${grilla}`}
        >
          {matches.map((m) =>
            modoDuelo ? <DueloCard key={m.key} match={m} etiqueta={etiquetaDuelo} /> : <CruceCard key={m.key} match={m} />,
          )}
        </div>

        <div className="relative mt-5">
          <Link
            href="/playoffs"
            className="inline-flex rounded-lg border border-accent-gold/30 bg-accent-gold/[0.06] px-4 py-2 font-body text-sm font-semibold uppercase tracking-wide text-accent-gold transition-colors hover:bg-accent-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold"
          >
            Ver bracket completo →
          </Link>
        </div>

        {copaPlata && copaPlata.matches.length > 0 && <CopaPlataBand copa={copaPlata} />}
      </div>
    </section>
  );
}
