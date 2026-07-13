import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreNumber } from "@/components/design-system/score-number";
import { LiveBadge } from "@/components/design-system/live-badge";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  getMatchDetailPageData,
  type MatchBoxscoreRow,
  type MatchDetailPageData,
  type MatchDetailTeamRef,
  type MatchEventView,
} from "@/lib/public/match-detail-page-data";
import { clubLogoPad } from "@/lib/public/display";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Santiago";

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

// TikTok y Facebook quedan fuera por ahora: sin link oficial confirmado todavía.
const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/lbsc2026/" },
  { label: "YouTube", href: "https://www.youtube.com/@LigadeBasquetbolSanClemente" },
];

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function upper(value: string): string {
  return value.toLocaleUpperCase("es-CL").replace(/\./g, "");
}

function scheduledLabel(value: Date | string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return upper(dateTimeFormatter.format(date));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let data: MatchDetailPageData | null = null;
  try {
    data = await getMatchDetailPageData(id);
  } catch {
    /* metadata genérica si falla */
  }
  if (!data) return { title: "Partido" };

  const { homeTeam, awayTeam } = data.match;
  const title = `${homeTeam.name} vs ${awayTeam.name} | Liga de Básquetbol San Clemente`;
  const description = `Resultado, estadísticas y jugadas del partido entre ${homeTeam.name} y ${awayTeam.name} por la Liga de Básquetbol San Clemente.`;
  return { title, description };
}

/* ---- piezas ------------------------------------------------------------------ */

function TeamBlock({ team, align }: { team: MatchDetailTeamRef; align: "left" | "right" }) {
  return (
    <Link
      href={`/equipo/${teamSlug(team.name)}`}
      className={`flex min-w-0 flex-1 flex-col items-center gap-3 text-center transition-opacity hover:opacity-80 ${align === "left" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"}`}
    >
      <span
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-head text-lg uppercase leading-none text-white ring-1 ring-white/10 sm:h-20 sm:w-20"
        style={
          team.logoUrl
            ? {
                backgroundColor: "rgba(255,255,255,0.05)",
                backgroundImage: `url(${team.logoUrl})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundOrigin: "content-box",
                padding: `${clubLogoPad(team.abbr, 8)}px`,
              }
            : { background: `linear-gradient(155deg, ${team.color ?? "#7c3aed"}, #0a0e1a 82%)` }
        }
        aria-hidden={team.logoUrl ? true : undefined}
      >
        {team.logoUrl ? "" : team.abbr}
      </span>
      <span className="max-w-[10rem] truncate font-head text-lg uppercase leading-none tracking-tight text-text-primary sm:text-xl">
        {team.name}
      </span>
    </Link>
  );
}

// Mismo criterio de slug que team-page-data.ts (a partir del nombre corto de
// display, no del oficial) — acá alcanza porque solo se usa para armar el
// link, no para resolver datos.
function teamSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function StatusBadge({ status }: { status: MatchDetailPageData["match"]["status"] }) {
  if (status === "live") return <LiveBadge />;
  if (status === "finished") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        Finalizado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-text-secondary">
      Programado
    </span>
  );
}

function SummaryCards({ summary }: { summary: MatchDetailPageData["summary"] }) {
  if (!summary) return null;
  const cards = [
    summary.topScorer && {
      label: "Máximo anotador",
      value: summary.topScorer.name,
      sub: `${summary.topScorer.teamAbbr} · ${summary.topScorer.points} pts`,
    },
    summary.mvp && { label: "MVP del partido", value: summary.mvp.name, sub: summary.mvp.teamAbbr },
    { label: "Jugadores con stats", value: String(summary.totalPlayersWithStats), sub: null },
    summary.totalEvents > 0 && { label: "Jugadas registradas", value: String(summary.totalEvents), sub: null },
  ].filter((c): c is { label: string; value: string; sub: string | null } => Boolean(c));

  if (cards.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">Resumen</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-bg-elevated p-4 text-center sm:p-5">
            <p className="font-head text-xl uppercase leading-tight tracking-tight text-accent-gold sm:text-2xl">
              {c.value}
            </p>
            {c.sub && <p className="mt-1 font-body text-xs text-text-secondary">{c.sub}</p>}
            <p className="mt-2 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              {c.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoxscoreTeam({ team, rows }: { team: MatchDetailTeamRef; rows: MatchBoxscoreRow[] }) {
  const tieneFaltas = rows.some((r) => r.fouls != null);
  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-head text-[10px] uppercase leading-none text-white ring-1 ring-white/10"
          style={{
            background: team.logoUrl
              ? `rgba(255,255,255,0.05) center/contain no-repeat url(${team.logoUrl})`
              : `linear-gradient(155deg, ${team.color ?? "#7c3aed"}, #0a0e1a 82%)`,
          }}
        >
          {team.logoUrl ? "" : team.abbr}
        </span>
        <span className="font-head text-base uppercase leading-none tracking-tight text-text-primary">{team.name}</span>
      </div>

      {rows.length === 0 ? (
        <p className="font-body text-xs text-text-secondary">Sin estadísticas registradas para este equipo.</p>
      ) : (
        <>
          {/* Desktop: tabla mini */}
          <table className="hidden w-full border-collapse sm:table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 text-left font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  Jugador
                </th>
                <th className="px-2 py-2 text-right font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  PTS
                </th>
                {tieneFaltas && (
                  <th className="px-2 py-2 text-right font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    F
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] last:border-b-0">
                  <td className="px-2 py-2 font-body text-sm text-text-primary">
                    <span className="min-w-0 truncate">{r.name}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-primary">{r.points}</td>
                  {tieneFaltas && (
                    <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-secondary">
                      {r.fouls ?? "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: lista compacta */}
          <ul className="flex flex-col divide-y divide-white/[0.06] sm:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-body text-sm text-text-primary">{r.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-text-secondary">
                  {r.points} PTS{r.fouls != null ? ` · ${r.fouls} F` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EventRow({ entry }: { entry: MatchEventView }) {
  if (entry.side === "neutral") {
    return (
      <li className="flex justify-center py-2.5">
        <span className="rounded-full bg-white/5 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {entry.periodLabel} · {entry.description}
        </span>
      </li>
    );
  }

  const esLocal = entry.side === "local";
  return (
    <li className={`flex py-2.5 ${esLocal ? "justify-start" : "justify-end"}`}>
      <div
        className={`w-full max-w-[22rem] rounded-xl border-l-2 px-3 py-2 sm:w-1/2 ${
          entry.isImportantFoul
            ? "border-live-pulse/60 bg-live-pulse/[0.06]"
            : esLocal
              ? "border-accent-purple/50 bg-white/[0.02]"
              : "border-accent-orange/50 bg-white/[0.02] sm:border-l-0 sm:border-r-2 sm:text-right"
        }`}
      >
        <div className={`flex items-center gap-2 text-[11px] text-text-secondary ${esLocal ? "" : "sm:flex-row-reverse"}`}>
          <span className="font-head uppercase tracking-tight text-accent-gold">{entry.periodLabel}</span>
          <span className="font-mono tabular-nums">{entry.clockLabel ?? "sin reloj"}</span>
          {entry.teamAbbr && <span className="uppercase">{entry.teamAbbr}</span>}
        </div>
        <p className="mt-0.5 font-body text-sm text-text-primary">
          {entry.description}
          {entry.value != null && <span className="ml-1.5 font-head text-accent-blue">+{entry.value}</span>}
        </p>
      </div>
    </li>
  );
}

function EventsTimeline({ events }: { events: MatchEventView[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-5 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">Jugadas del partido</h2>
      {events.length === 0 ? (
        <p className="font-body text-sm text-text-secondary">
          Este partido no tiene un registro de jugadas disponible.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-bg-elevated px-4 sm:px-6">
          {events.map((e) => (
            <EventRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActaSection({ acta }: { acta: MatchDetailPageData["acta"] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-4 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
        Acta del partido
      </h2>
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-5 sm:p-6">
        {acta?.observaciones ? (
          <p className="font-body text-sm leading-relaxed text-text-primary">{acta.observaciones}</p>
        ) : (
          <p className="font-body text-sm text-text-secondary">Sin observaciones registradas.</p>
        )}
      </div>
    </div>
  );
}

/* ---- estados de la página ---------------------------------------------------- */

function FinishedMatchView({ data }: { data: MatchDetailPageData }) {
  const { match, summary, boxscore, events, acta } = data;
  const hasScore = match.homeScore != null && match.awayScore != null;

  return (
    <div className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-center">
          <StatusBadge status={match.status} />
          <span className="font-body text-sm font-bold uppercase tracking-[0.2em] text-text-primary">
            {match.jornadaLabel}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <TeamBlock team={match.homeTeam} align="left" />
          <div className="shrink-0">
            {hasScore ? (
              <div className="flex items-center gap-3 sm:gap-5">
                <ScoreNumber
                  value={match.homeScore!}
                  size="xl"
                  accent={match.winner === "home" ? "gold" : "none"}
                />
                <span className="font-head text-4xl leading-none text-text-secondary sm:text-5xl">-</span>
                <ScoreNumber
                  value={match.awayScore!}
                  size="xl"
                  accent={match.winner === "away" ? "gold" : "none"}
                />
              </div>
            ) : (
              <span className="font-head text-2xl uppercase leading-none text-text-secondary">Sin resultado</span>
            )}
          </div>
          <TeamBlock team={match.awayTeam} align="right" />
        </div>

        {match.venue && (
          <p className="mt-6 text-center font-body text-xs uppercase tracking-widest text-text-secondary">
            {match.venue}
          </p>
        )}
      </div>

      <SummaryCards summary={summary} />

      <div className="mt-10">
        <h2 className="mb-5 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">Boxscore</h2>
        {boxscore.home.length === 0 && boxscore.away.length === 0 ? (
          <p className="font-body text-sm text-text-secondary">No hay estadísticas por jugador para este partido.</p>
        ) : (
          <div className="flex flex-col gap-8 rounded-2xl border border-white/10 bg-bg-elevated p-5 sm:flex-row sm:gap-10 sm:p-6">
            <BoxscoreTeam team={match.homeTeam} rows={boxscore.home} />
            <div className="hidden w-px bg-white/10 sm:block" aria-hidden="true" />
            <BoxscoreTeam team={match.awayTeam} rows={boxscore.away} />
          </div>
        )}
      </div>

      <EventsTimeline events={events} />
      <ActaSection acta={acta} />
    </div>
  );
}

function LiveRedirectView({ match }: { match: MatchDetailPageData["match"] }) {
  return (
    <div className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-14 text-center sm:px-8">
        <div className="mb-4 flex justify-center">
          <LiveBadge />
        </div>
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          {match.homeTeam.name} vs {match.awayTeam.name} está en curso — sigue el marcador y las jugadas en vivo.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/en-vivo"
            className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
          >
            Ver en vivo
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScheduledView({ match }: { match: MatchDetailPageData["match"] }) {
  const fecha = scheduledLabel(match.scheduledAt);
  return (
    <div className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-10">
        <div className="mb-6 flex justify-center">
          <StatusBadge status={match.status} />
        </div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <TeamBlock team={match.homeTeam} align="left" />
          <span className="shrink-0 font-head text-2xl uppercase leading-none text-text-secondary">vs</span>
          <TeamBlock team={match.awayTeam} align="right" />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 text-center">
          {fecha && <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">{fecha}</span>}
          {match.venue && <span className="font-body text-xs uppercase tracking-widest text-text-secondary">{match.venue}</span>}
        </div>
        <p className="mt-6 text-center font-body text-sm text-text-secondary">
          Partido programado. Aún no hay estadísticas disponibles.
        </p>
      </div>
    </div>
  );
}

function MatchError() {
  return (
    <section className="lbsc-container pb-16">
      <ModuleError label="el partido" minHeight="min-h-[260px]" />
    </section>
  );
}

/* ---- página -------------------------------------------------------------------- */

export default async function PartidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: MatchDetailPageData | null = null;
  let failed = false;

  try {
    data = await getMatchDetailPageData(id);
  } catch {
    failed = true;
  }

  if (!failed && !data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={data?.match.status === "live"} />

      <main className="pt-[var(--navbar-height)]">
        {failed || !data ? (
          <>
            <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pt-20">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
                Partido LBSC
              </span>
              <h1 className="mt-3 font-head text-5xl uppercase leading-none tracking-tight text-text-primary sm:text-6xl">
                Partido
              </h1>
            </header>
            <MatchError />
          </>
        ) : (
          <>
            <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pt-20">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
                {data.match.jornadaLabel}
              </span>
              <h1 className="mt-3 font-head text-5xl uppercase leading-none tracking-tight text-text-primary sm:text-6xl">
                {data.match.status === "finished" ? "Resultado final" : data.match.status === "live" ? "Partido en vivo" : "Partido programado"}
              </h1>
            </header>

            {data.match.status === "finished" ? (
              <FinishedMatchView data={data} />
            ) : data.match.status === "live" ? (
              <LiveRedirectView match={data.match} />
            ) : (
              <ScheduledView match={data.match} />
            )}
          </>
        )}
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
