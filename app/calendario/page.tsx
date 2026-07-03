import Link from "next/link";
import { LiveBadge } from "@/components/design-system/live-badge";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  getCalendarPageData,
  type CalendarMatch,
  type CalendarMatchStatus,
  type CalendarRound,
  type CalendarTeam,
} from "@/lib/public/calendar-data";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Santiago";

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/#en-vivo" },
  { label: "Tabla", href: "/#tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Facebook", href: "#" },
];

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
});

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

function asDate(value: CalendarMatch["fecha"] | CalendarRound["date"]): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateLabel(value: CalendarMatch["fecha"] | CalendarRound["date"], fallback = "Fecha por confirmar"): string {
  const date = asDate(value);
  return date ? upper(dateFormatter.format(date)) : fallback;
}

function shortDateLabel(value: CalendarMatch["fecha"]): string {
  const date = asDate(value);
  return date ? upper(shortDateFormatter.format(date)) : "POR CONFIRMAR";
}

function timeLabel(value: CalendarMatch["fecha"]): string {
  const date = asDate(value);
  return date ? timeFormatter.format(date) : "--:--";
}

function hasScore(match: CalendarMatch): boolean {
  return match.homeScore != null && match.awayScore != null;
}

function TeamChip({ team, score }: { team: CalendarTeam; score?: number | null }) {
  const shieldStyle = team.logoUrl
    ? {
        backgroundImage: `url(${team.logoUrl})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }
    : { background: `linear-gradient(155deg, ${team.color ?? "#7c3aed"}, #0a0e1a 82%)` };

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-elevated font-head text-[11px] uppercase leading-none text-white ring-1 ring-white/10"
        style={shieldStyle}
        aria-hidden={team.logoUrl ? true : undefined}
      >
        {team.logoUrl ? "" : team.abbr}
      </span>
      <span className="min-w-0 font-head text-base uppercase leading-none tracking-tight text-text-primary">
        <span className="block truncate sm:hidden">{team.abbr}</span>
        <span className="hidden truncate sm:block">{team.name}</span>
      </span>
      {score != null && (
        <span className="ml-auto font-head text-2xl leading-none tabular-nums text-text-primary sm:ml-1">
          {score}
        </span>
      )}
    </span>
  );
}

function StatusLabel({ status }: { status: CalendarMatchStatus }) {
  if (status === "live") return <LiveBadge />;

  return (
    <span className="font-body text-[11px] font-bold uppercase tracking-[0.22em] text-text-secondary">
      {status === "finished" ? "Final" : "Programado"}
    </span>
  );
}

function ScoreBlock({ match }: { match: CalendarMatch }) {
  if (match.status === "scheduled") return <StatusLabel status={match.status} />;

  if (!hasScore(match)) {
    return (
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <StatusLabel status={match.status} />
        <span className="font-head text-xl uppercase leading-none text-accent-gold">
          {match.status === "live" ? "En curso" : "Sin marcador"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 lg:items-end">
      <StatusLabel status={match.status} />
      <span className="font-head text-2xl leading-none tabular-nums text-text-primary">
        {match.homeScore} - {match.awayScore}
      </span>
    </div>
  );
}

function MatchRow({ match }: { match: CalendarMatch }) {
  const showInlineScores = match.status === "finished" && hasScore(match);

  return (
    <li>
      <article className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[116px_1fr_158px] lg:items-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-col lg:items-start">
          <time
            dateTime={asDate(match.fecha)?.toISOString()}
            className="font-head text-2xl uppercase leading-none tabular-nums text-text-primary lg:text-3xl"
          >
            {timeLabel(match.fecha)}
          </time>
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
            {shortDateLabel(match.fecha)}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <TeamChip team={match.homeTeam} score={showInlineScores ? match.homeScore : undefined} />
          <span className="px-1 text-center font-body text-[11px] font-bold uppercase tracking-[0.24em] text-text-secondary">
            vs
          </span>
          <TeamChip team={match.awayTeam} score={showInlineScores ? match.awayScore : undefined} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
          {match.venue && (
            <span className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary lg:hidden">
              {match.venue}
            </span>
          )}
          <ScoreBlock match={match} />
        </div>

        {match.venue && (
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary lg:col-start-2 lg:block">
            {match.venue}
          </p>
        )}
      </article>
    </li>
  );
}

function CalendarRoundBlock({ round }: { round: CalendarRound }) {
  return (
    <section className="overflow-hidden border-t border-white/10 first:border-t-0" aria-labelledby={`${round.key}-title`}>
      <div className="bg-bg-elevated px-4 py-4 sm:px-5 lg:flex lg:items-end lg:justify-between">
        <h2 id={`${round.key}-title`} className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary">
          {round.label}
        </h2>
        <p className="mt-2 font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-orange lg:mt-0">
          {dateLabel(round.date)}
        </p>
      </div>
      <ul className="divide-y divide-white/[0.07]" aria-label={`${round.label} - partidos`}>
        {round.matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
    </section>
  );
}

function EmptyCalendar() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-12 text-center sm:px-8">
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          El calendario aparecerá cuando se confirme la programación.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}

function CalendarError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="el calendario" minHeight="min-h-[260px]" />
    </section>
  );
}

export default async function CalendarioPage() {
  let data: Awaited<ReturnType<typeof getCalendarPageData>> | null = null;
  let failed = false;

  try {
    data = await getCalendarPageData();
  } catch {
    failed = true;
  }

  const rounds = data?.rounds ?? [];
  const isLiveNow = rounds.some((round) => round.matches.some((match) => match.status === "live"));

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={isLiveNow} />

      <main className="pt-[var(--navbar-height)]">
        <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pb-10 lg:pt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
                Temporada 2026
              </span>
              <h1 className="mt-3 font-head text-6xl uppercase leading-none tracking-tight text-text-primary sm:text-7xl lg:text-8xl">
                Calendario
              </h1>
              <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-text-secondary sm:text-base">
                Programación oficial de la Liga de Básquetbol San Clemente.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
            >
              Volver al inicio
            </Link>
          </div>
        </header>

        {failed ? (
          <CalendarError />
        ) : rounds.length === 0 ? (
          <EmptyCalendar />
        ) : (
          <div className="lbsc-container pb-16">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-base">
              {rounds.map((round) => (
                <CalendarRoundBlock key={round.key} round={round} />
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
