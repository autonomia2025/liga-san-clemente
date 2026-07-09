import type { Metadata } from "next";
import Link from "next/link";
import { LiveBadge } from "@/components/design-system/live-badge";
import { ScoreNumber } from "@/components/design-system/score-number";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  getLivePageData,
  type LiveBoxscoreRow,
  type LiveGameData,
  type LivePlayerName,
  type LivePlayerStat,
  type LiveTeam,
  type PlayByPlayEntry,
} from "@/lib/public/live-page-data";
import { clubLogoPad } from "@/lib/public/display";
import { labelPeriodo } from "@/lib/mesa/live-match-state";
import { LiveRefresher } from "@/components/site/live-refresher";
import { LiveClock } from "@/components/site/live-clock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partidos en vivo",
  description: "Sigue los partidos en vivo de la Liga de Básquetbol San Clemente con marcador y estado del encuentro.",
};

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

function scheduledLabel(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return upper(dateTimeFormatter.format(date));
}

/* ---- piezas compartidas ---------------------------------------------------- */

function TeamBlock({ team, align }: { team: LiveTeam; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-3 text-center ${align === "left" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"}`}>
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
    </div>
  );
}

function LeadersRow({ leaders }: { leaders: LivePlayerStat[] }) {
  if (leaders.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        Los líderes aparecerán cuando se registren estadísticas.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap justify-center gap-x-8 gap-y-4">
      {leaders.map((l) => (
        <li key={l.id ?? l.name} className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated font-head text-[11px] uppercase leading-none text-text-primary ring-1 ring-white/10">
            {l.initials}
          </span>
          <div className="flex flex-col">
            <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">{l.name}</span>
            {l.teamAbbr && (
              <span className="font-body text-[11px] uppercase tracking-wide text-text-secondary">{l.teamAbbr}</span>
            )}
          </div>
          <span className="font-head text-xl leading-none tabular-nums text-accent-gold">
            {l.points}
            <span className="ml-1 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
              pts
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function EnCanchaColumna({ team, jugadores }: { team: LiveTeam; jugadores: LivePlayerName[] }) {
  return (
    <div className="flex-1">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-head text-sm uppercase leading-none tracking-tight text-text-primary">
          {team.name}
        </span>
      </div>
      {jugadores.length === 0 ? (
        <p className="font-body text-xs text-text-secondary">Sin datos de cancha todavía.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {jugadores.map((j) => (
            <li key={j.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" aria-hidden="true" />
              <span className="min-w-0 truncate font-body text-sm text-text-primary">{j.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnCanchaSection({
  homeTeam,
  awayTeam,
  local,
  visitante,
}: {
  homeTeam: LiveTeam;
  awayTeam: LiveTeam;
  local: LivePlayerName[];
  visitante: LivePlayerName[];
}) {
  if (local.length === 0 && visitante.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="mb-4 text-center font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
        En cancha
      </h2>
      <div className="flex flex-col gap-8 rounded-2xl border border-white/10 bg-bg-elevated p-5 sm:flex-row sm:gap-10 sm:p-6">
        <EnCanchaColumna team={homeTeam} jugadores={local} />
        <div className="hidden w-px bg-white/10 sm:block" aria-hidden="true" />
        <EnCanchaColumna team={awayTeam} jugadores={visitante} />
      </div>
    </div>
  );
}

function BoxscoreTeam({ team, rows }: { team: LiveTeam; rows: LiveBoxscoreRow[] }) {
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
        <p className="font-body text-xs text-text-secondary">Sin jugadores registrados todavía.</p>
      ) : (
        (() => {
          const tieneMinutos = rows.some((r) => r.minutosLabel != null);
          return (
            <>
              {/* Desktop: tabla mini — el nombre es el foco, el dorsal no se
                  muestra acá (ya no aporta tanto como en Mesa: el público
                  reconoce por nombre). */}
              <table className="hidden w-full border-collapse sm:table">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-2 py-2 text-left font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      Jugador
                    </th>
                    <th className="px-2 py-2 text-right font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      PTS
                    </th>
                    <th className="px-2 py-2 text-right font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      F
                    </th>
                    {tieneMinutos && (
                      <th className="px-2 py-2 text-right font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                        MIN
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id ?? r.playerName} className="border-b border-white/[0.06] last:border-b-0">
                      <td className="px-2 py-2 font-body text-sm text-text-primary">
                        <span className="flex items-center gap-2">
                          {r.enCancha && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold"
                              aria-label="En cancha"
                              title="En cancha"
                            />
                          )}
                          <span className="min-w-0 truncate">{r.playerName}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-primary">{r.points}</td>
                      <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-text-secondary">
                        {r.fouls ?? 0}
                      </td>
                      {tieneMinutos && (
                        <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-text-secondary">
                          {r.minutosLabel ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile: lista compacta, sin scroll horizontal */}
              <ul className="flex flex-col divide-y divide-white/[0.06] sm:hidden">
                {rows.map((r) => (
                  <li key={r.id ?? r.playerName} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {r.enCancha && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" aria-hidden="true" />
                      )}
                      <span className="min-w-0 truncate font-body text-sm text-text-primary">{r.playerName}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-text-secondary">
                      {r.points} PTS · {r.fouls ?? 0} F{r.minutosLabel ? ` · ${r.minutosLabel}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()
      )}
    </div>
  );
}

// Tipo "cancha": local a la izquierda, visitante a la derecha, eventos
// neutrales (inicio/fin de cuarto, fin de partido) centrados de lado a lado.
// La lista sigue siendo un único flujo cronológico (más reciente primero) —
// solo cambia la alineación/color por fila, nunca el orden.
function PlayByPlayRow({ entry }: { entry: PlayByPlayEntry }) {
  if (entry.side === "neutral") {
    return (
      <li className="flex justify-center py-2.5">
        <span className="rounded-full bg-white/5 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {labelPeriodo(entry.cuarto)} · {entry.descripcion}
        </span>
      </li>
    );
  }

  const esLocal = entry.side === "local";
  return (
    <li className={`flex py-2.5 ${esLocal ? "justify-start" : "justify-end"}`}>
      <div
        className={`w-full max-w-[22rem] rounded-xl border-l-2 px-3 py-2 sm:w-1/2 ${
          esLocal ? "border-accent-purple/50 bg-white/[0.02]" : "border-accent-orange/50 bg-white/[0.02] sm:border-l-0 sm:border-r-2 sm:text-right"
        }`}
      >
        <div
          className={`flex items-center gap-2 text-[11px] text-text-secondary ${esLocal ? "" : "sm:flex-row-reverse"}`}
        >
          <span className="font-head uppercase tracking-tight text-accent-gold">{labelPeriodo(entry.cuarto)}</span>
          <span className="font-mono tabular-nums">{entry.clockLabel ?? "sin reloj"}</span>
          {entry.equipoAbbr && <span className="uppercase">{entry.equipoAbbr}</span>}
        </div>
        <p className="mt-0.5 font-body text-sm text-text-primary">
          {entry.descripcion}
          {entry.valor != null && <span className="ml-1.5 font-head text-accent-blue">+{entry.valor}</span>}
        </p>
      </div>
    </li>
  );
}

function PlayByPlay({ entries }: { entries: PlayByPlayEntry[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-5 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
        Play by Play
      </h2>
      {entries.length === 0 ? (
        <p className="font-body text-sm text-text-secondary">Aún no hay acciones registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-bg-elevated px-4 sm:px-6">
          {entries.map((e) => (
            <PlayByPlayRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- estados de la página ---------------------------------------------------- */

function LiveMatchView({ match }: { match: NonNullable<LiveGameData["match"]> }) {
  const hasScore = match.homeScore != null && match.awayScore != null;
  const finalizado = match.status === "finished";
  return (
    <div className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-center">
          {finalizado ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Finalizado
            </span>
          ) : (
            <LiveBadge />
          )}
          <span className="font-body text-sm font-bold uppercase tracking-[0.2em] text-text-primary">
            {match.periodLabel ?? "EN CURSO"}
            {match.reloj && (
              <>
                {" · "}
                <LiveClock estado={match.reloj.estado} remainingSeconds={match.reloj.remainingSeconds} />
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <TeamBlock team={match.homeTeam} align="left" />
          <div className="shrink-0">
            {hasScore ? (
              <div className="flex items-center gap-3 sm:gap-5">
                <ScoreNumber value={match.homeScore!} size="xl" accent="gold" />
                <span className="font-head text-4xl leading-none text-text-secondary sm:text-5xl">-</span>
                <ScoreNumber value={match.awayScore!} size="xl" accent="gold" />
              </div>
            ) : (
              <span className="font-head text-3xl uppercase leading-none text-accent-orange">En curso</span>
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

      <EnCanchaSection
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        local={match.jugadoresEnCanchaLocal ?? []}
        visitante={match.jugadoresEnCanchaVisitante ?? []}
      />

      <div className="mt-10">
        <h2 className="mb-4 text-center font-head text-2xl uppercase leading-none tracking-tight text-text-primary">
          Líderes del partido
        </h2>
        <LeadersRow leaders={match.leaders ?? []} />
      </div>

      <div className="mt-10">
        <h2 className="mb-5 font-head text-2xl uppercase leading-none tracking-tight text-text-primary">Boxscore</h2>
        {(match.homeBoxscore?.length ?? 0) === 0 && (match.awayBoxscore?.length ?? 0) === 0 ? (
          <p className="font-body text-sm text-text-secondary">
            El boxscore aparecerá cuando la mesa registre estadísticas.
          </p>
        ) : (
          <div className="flex flex-col gap-8 rounded-2xl border border-white/10 bg-bg-elevated p-5 sm:flex-row sm:gap-10 sm:p-6">
            <BoxscoreTeam team={match.homeTeam} rows={match.homeBoxscore ?? []} />
            <div className="hidden w-px bg-white/10 sm:block" aria-hidden="true" />
            <BoxscoreTeam team={match.awayTeam} rows={match.awayBoxscore ?? []} />
          </div>
        )}
      </div>

      <PlayByPlay entries={match.playByPlay ?? []} />
    </div>
  );
}

function UpcomingMatchView({ match }: { match: NonNullable<LiveGameData["match"]> }) {
  const fecha = scheduledLabel(match.scheduledAt);
  return (
    <div className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <TeamBlock team={match.homeTeam} align="left" />
          <span className="shrink-0 font-head text-2xl uppercase leading-none text-text-secondary">vs</span>
          <TeamBlock team={match.awayTeam} align="right" />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 text-center">
          {fecha && (
            <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">{fecha}</span>
          )}
          {match.venue && (
            <span className="font-body text-xs uppercase tracking-widest text-text-secondary">{match.venue}</span>
          )}
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          href="/calendario"
          className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Ver calendario completo
        </Link>
      </div>
    </div>
  );
}

function NoneView() {
  return (
    <section className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-14 text-center sm:px-8">
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          Revisa el calendario para conocer la próxima fecha de la LBSC.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/calendario"
            className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
          >
            Ver calendario
          </Link>
          <Link
            href="/tabla"
            className="inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
          >
            Ver tabla
          </Link>
        </div>
      </div>
    </section>
  );
}

function LiveError() {
  return (
    <section className="lbsc-container pb-16">
      <ModuleError label="el en vivo" minHeight="min-h-[260px]" />
    </section>
  );
}

/* ---- header dinámico ---------------------------------------------------------- */

function PageHeader({ state }: { state: LiveGameData["state"] | "error" }) {
  const title =
    state === "live"
      ? "Partido en vivo"
      : state === "finished"
        ? "Resultado final"
        : state === "upcoming"
          ? "Próximo partido"
          : "En vivo";
  const subtitle =
    state === "live"
      ? "Marcador y estadísticas del partido en curso."
      : state === "finished"
        ? "El partido finalizó — este es el resultado."
        : state === "upcoming"
          ? "El próximo partido aparecerá aquí cuando comience."
          : "No hay partidos en vivo por el momento.";

  return (
    <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pb-10 lg:pt-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
            LBSC en vivo
          </span>
          <h1 className="mt-3 font-head text-6xl uppercase leading-none tracking-tight text-text-primary sm:text-7xl lg:text-8xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-text-secondary sm:text-base">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/calendario"
            className="inline-flex w-fit rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
          >
            Ver calendario
          </Link>
          <Link
            href="/tabla"
            className="inline-flex w-fit rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
          >
            Ver tabla
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---- página ------------------------------------------------------------------ */

export default async function EnVivoPage() {
  let data: LiveGameData | null = null;
  let failed = false;

  try {
    data = await getLivePageData();
  } catch {
    failed = true;
  }

  const isLiveNow = data?.state === "live";
  const headerState = failed ? "error" : (data?.state ?? "none");

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <LiveRefresher />
      <Navbar isLiveNow={isLiveNow} />

      <main className="pt-[var(--navbar-height)]">
        <PageHeader state={headerState} />

        {failed || !data ? (
          <LiveError />
        ) : (data.state === "live" || data.state === "finished") && data.match ? (
          <LiveMatchView match={data.match} />
        ) : data.state === "upcoming" && data.match ? (
          <UpcomingMatchView match={data.match} />
        ) : (
          <NoneView />
        )}
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
