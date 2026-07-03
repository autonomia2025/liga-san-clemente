import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveBadge } from "@/components/design-system/live-badge";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  getTeamPageData,
  type TeamMatchSummary,
  type TeamPageData,
  type TeamRosterPlayer,
  type TeamTopScorer,
} from "@/lib/public/team-page-data";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Santiago";

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Facebook", href: "#" },
];

const shortDateFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function upper(value: string): string {
  return value.toLocaleUpperCase("es-CL").replace(/\./g, "");
}

function asDate(value: TeamMatchSummary["date"]): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateLabel(value: TeamMatchSummary["date"]): string {
  const date = asDate(value);
  return date ? upper(shortDateFormatter.format(date)) : "FECHA POR CONFIRMAR";
}

function timeLabel(value: TeamMatchSummary["date"]): string | null {
  const date = asDate(value);
  return date ? timeFormatter.format(date) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let data: TeamPageData | null = null;
  try {
    data = await getTeamPageData(slug);
  } catch {
    /* metadata genérica si falla */
  }
  if (!data) return { title: "Equipo | LBSC 2026" };
  return {
    title: `${data.team.name} | LBSC 2026`,
    description: `Perfil oficial de ${data.team.name} en la Liga de Básquetbol San Clemente, temporada 2026.`,
  };
}

/* ---- piezas ------------------------------------------------------------------ */

function TeamCrest({ team, size = "lg" }: { team: TeamPageData["team"]; size?: "lg" | "sm" }) {
  const dims = size === "lg" ? "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl" : "h-9 w-9 text-[11px]";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-2xl font-head uppercase leading-none text-white ring-1 ring-white/10`}
      style={{
        background: team.logoUrl
          ? `center/cover no-repeat url(${team.logoUrl})`
          : `linear-gradient(155deg, ${team.color}, #0a0e1a 82%)`,
      }}
      role="img"
      aria-label={team.logoUrl ? team.name : `Escudo de ${team.name}`}
    >
      {team.logoUrl ? "" : team.abbr}
    </span>
  );
}

function StatBlock({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 sm:items-start">
      <span
        className={`font-head text-3xl leading-none tabular-nums sm:text-4xl ${accent ? "text-accent-gold" : "text-text-primary"}`}
      >
        {value}
      </span>
      <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-text-secondary">{label}</span>
    </div>
  );
}

function MatchRow({ match, teamName }: { match: TeamMatchSummary; teamName: string }) {
  const rival = match.isHome ? match.awayTeam : match.homeTeam;
  const localVisita = match.isHome ? "Local" : "Visita";
  const hasScore = match.homeScore != null && match.awayScore != null;

  return (
    <li className="flex flex-col gap-2 border-t border-white/[0.07] py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
            {dateLabel(match.date)}
            {timeLabel(match.date) ? ` · ${timeLabel(match.date)}` : ""}
          </span>
          <span className="font-body text-sm text-text-primary">
            vs <span className="font-semibold">{rival.name}</span>{" "}
            <span className="text-text-secondary">({localVisita})</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {match.status === "live" && <LiveBadge />}
        {match.status === "finished" && hasScore && (
          <>
            <span className="font-head text-xl leading-none tabular-nums text-text-primary">
              {match.homeScore} - {match.awayScore}
            </span>
            {match.result === "win" && (
              <span className="rounded-md bg-success/15 px-2 py-1 font-body text-[10px] font-bold uppercase tracking-wider text-success">
                Victoria
              </span>
            )}
            {match.result === "loss" && (
              <span className="rounded-md bg-live-pulse/15 px-2 py-1 font-body text-[10px] font-bold uppercase tracking-wider text-live-pulse">
                Derrota
              </span>
            )}
          </>
        )}
        {match.status === "scheduled" && (
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.22em] text-text-secondary">
            Programado
          </span>
        )}
      </div>
      <span className="sr-only">{teamName}</span>
    </li>
  );
}

function RosterList({ roster }: { roster: TeamRosterPlayer[] }) {
  if (roster.length === 0) {
    return <p className="font-body text-sm text-text-secondary">El roster aparecerá cuando sea confirmado por la liga.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {roster.map((p) => (
        <li key={p.id} className="flex items-center gap-3 border-t border-white/[0.07] py-2.5 first:border-t-0">
          <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-text-secondary">
            {p.number != null ? `#${p.number}` : "—"}
          </span>
          <span className="font-body text-sm text-text-primary">{p.name}</span>
        </li>
      ))}
    </ul>
  );
}

function TopScorersList({ scorers }: { scorers: TeamTopScorer[] }) {
  if (scorers.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        Los líderes del equipo aparecerán cuando se registren estadísticas.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {scorers.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3">
          <span className={`w-6 font-head text-lg leading-none tabular-nums ${i === 0 ? "text-accent-gold" : "text-text-secondary"}`}>
            {i + 1}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated font-head text-[10px] uppercase leading-none text-text-primary ring-1 ring-white/10">
            {s.initials}
          </span>
          <span className="flex-1 font-body text-sm text-text-primary">{s.name}</span>
          <span className="font-head text-lg leading-none tabular-nums text-accent-gold">
            {s.points}
            <span className="ml-1 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              pts
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---- estados ------------------------------------------------------------------ */

function TeamError() {
  return (
    <section className="lbsc-container pb-16">
      <ModuleError label="el equipo" minHeight="min-h-[260px]" />
    </section>
  );
}

/* ---- página -------------------------------------------------------------------- */

export default async function EquipoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let data: TeamPageData | null = null;
  let failed = false;

  try {
    data = await getTeamPageData(slug);
  } catch {
    failed = true;
  }

  if (!failed && !data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />

      <main className="pt-[var(--navbar-height)]">
        {failed || !data ? (
          <>
            <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pt-20">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
                Equipo LBSC
              </span>
              <h1 className="mt-3 font-head text-5xl uppercase leading-none tracking-tight text-text-primary sm:text-6xl">
                Equipo
              </h1>
            </header>
            <TeamError />
          </>
        ) : (
          <>
            {/* Header / hero de equipo */}
            <section className="relative overflow-hidden border-b border-white/10">
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{ background: `linear-gradient(160deg, ${data.team.color}, transparent 60%)` }}
                aria-hidden="true"
              />
              <div className="lbsc-noise" aria-hidden="true" />
              <div className="lbsc-container relative flex flex-col items-center gap-5 py-14 text-center sm:py-18 lg:py-20">
                <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
                  Equipo LBSC · Temporada 2026
                </span>
                <TeamCrest team={data.team} size="lg" />
                <h1 className="font-head text-5xl uppercase leading-none tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
                  {data.team.name}
                </h1>
                {data.standing?.position ? (
                  <p className="font-body text-sm font-semibold uppercase tracking-wide text-text-secondary">
                    #{data.standing.position} en la tabla · {data.standing.tablePoints} pts
                  </p>
                ) : (
                  <p className="max-w-md font-body text-sm text-text-secondary">
                    La posición aparecerá cuando el equipo registre resultados oficiales.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/tabla"
                    className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
                  >
                    Ver tabla
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </section>

            <div className="lbsc-container flex flex-col gap-12 py-12 sm:py-14">
              {/* Resumen deportivo */}
              {data.standing && (
                <section aria-label="Resumen deportivo">
                  <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:grid-cols-5 sm:gap-6">
                    <StatBlock label="PJ" value={data.standing.played} />
                    <StatBlock label="PG" value={data.standing.wins} />
                    <StatBlock label="PP" value={data.standing.losses} />
                    <StatBlock label="DIF" value={data.standing.pointDiff > 0 ? `+${data.standing.pointDiff}` : data.standing.pointDiff} />
                    <StatBlock label="PTS" value={data.standing.tablePoints} accent />
                  </div>
                </section>
              )}

              {/* Últimos partidos */}
              <section aria-label="Últimos partidos">
                <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
                  Últimos partidos
                </h2>
                {data.recentMatches.length === 0 ? (
                  <p className="font-body text-sm text-text-secondary">
                    Los últimos resultados aparecerán cuando el equipo dispute partidos oficiales.
                  </p>
                ) : (
                  <ul className="rounded-2xl border border-white/10 bg-bg-elevated px-5">
                    {data.recentMatches.map((m) => (
                      <MatchRow key={m.id} match={m} teamName={data.team.name} />
                    ))}
                  </ul>
                )}
              </section>

              {/* Próximos partidos */}
              <section aria-label="Próximos partidos">
                <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
                  Próximos partidos
                </h2>
                {data.upcomingMatches.length === 0 ? (
                  <p className="font-body text-sm text-text-secondary">
                    No hay próximos partidos programados para este equipo por ahora.
                  </p>
                ) : (
                  <ul className="rounded-2xl border border-white/10 bg-bg-elevated px-5">
                    {data.upcomingMatches.map((m) => (
                      <MatchRow key={m.id} match={m} teamName={data.team.name} />
                    ))}
                  </ul>
                )}
              </section>

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                {/* Roster */}
                <section aria-label="Roster">
                  <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
                    Roster
                  </h2>
                  <RosterList roster={data.roster} />
                </section>

                {/* Top anotadores */}
                <section aria-label="Top anotadores del equipo">
                  <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
                    Top anotadores
                  </h2>
                  <TopScorersList scorers={data.topScorers} />
                </section>
              </div>
            </div>
          </>
        )}
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
