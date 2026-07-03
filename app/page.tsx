import type { Metadata } from "next";
import { Countdown } from "@/components/public/countdown";
import { formatFechaCortaCL, formatHoraCortaCL } from "@/lib/fecha";
import { clubAbrev, clubGradient, clubNombreCorto } from "@/lib/public/display";
import { getStandings, type StandingRow } from "@/lib/public/standings";
import { getTopScorers, type TopScorerRow } from "@/lib/public/rankings";
import {
  getHeroData,
  getUltimosResultados,
  getEquipos,
  getProximasJornadas,
  type PartidoResumen,
} from "@/lib/public/home-data";

// La landing depende de datos en vivo (partido EN_CURSO, próxima jornada,
// últimos resultados) — no puede quedar prerenderizada estática en build,
// tiene que resolverse en cada request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LBSC 2026 | Liga de Básquetbol San Clemente",
  description:
    "Resultados, fixture, rankings y figuras de la Liga de Básquetbol San Clemente 2026.",
  openGraph: {
    title: "LBSC 2026 | Liga de Básquetbol San Clemente",
    description:
      "Resultados, fixture, rankings y figuras de la Liga de Básquetbol San Clemente 2026.",
    type: "website",
    locale: "es_CL",
  },
};

/* ---------------------------------------------------------------------------
   Primitivas
--------------------------------------------------------------------------- */

const BADGE_DIMS = {
  xs: "h-7 w-7 rounded-lg text-[9px]",
  sm: "h-9 w-9 rounded-lg text-[10px]",
  md: "h-11 w-11 rounded-xl text-xs",
  lg: "h-14 w-14 rounded-2xl text-sm",
} as const;

function ClubBadge({ nombre, size = "md" }: { nombre: string; size?: keyof typeof BADGE_DIMS }) {
  return (
    <span
      className={`flex ${BADGE_DIMS[size]} shrink-0 items-center justify-center font-ui font-bold uppercase text-white`}
      style={{ background: clubGradient(nombre) }}
    >
      {clubAbrev(nombre)}
    </span>
  );
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mb-5 flex scroll-mt-24 items-center gap-3 font-head text-2xl uppercase leading-none tracking-tight text-foreground sm:text-3xl"
    >
      <span className="h-5 w-1 rounded-full bg-accent-orange" />
      {children}
    </h2>
  );
}

function esGanador(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && a > b;
}

type EstadoPartido = PartidoResumen["estado"];

function estadoLabel(estado: EstadoPartido): string {
  if (estado === "EN_CURSO") return "En vivo";
  if (estado === "FINALIZADO") return "Final";
  return "Programado";
}

/* ---------------------------------------------------------------------------
   Match Center (protagonista): estado real de la fecha
--------------------------------------------------------------------------- */

function EstadoPill({ estado }: { estado: EstadoPartido }) {
  if (estado === "EN_CURSO") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-ui text-[10.5px] font-semibold uppercase tracking-wide text-success">
        <span className="live-halo h-1.5 w-1.5 rounded-full bg-success" />
        En vivo
      </span>
    );
  }
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-ui text-[10.5px] font-semibold uppercase tracking-wide ${
        estado === "FINALIZADO"
          ? "border-border-strong text-muted"
          : "border-accent-orange/35 bg-accent-orange/[0.1] text-accent-orange"
      }`}
    >
      {estadoLabel(estado)}
    </span>
  );
}

function MatchRow({ partido }: { partido: PartidoResumen }) {
  const conMarcador = partido.estado === "FINALIZADO" || partido.estado === "EN_CURSO";
  const localGana = esGanador(partido.resultadoLocal, partido.resultadoVisitante);
  const visitanteGana = esGanador(partido.resultadoVisitante, partido.resultadoLocal);
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-t border-border px-1 py-3.5 first:border-t-0 sm:grid-cols-[3.5rem_1fr_5.5rem]">
      <span className="font-mono text-[13px] text-muted">
        {partido.fechaHora ? formatHoraCortaCL(partido.fechaHora) : "s/h"}
      </span>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <span className={`truncate font-ui text-[13px] uppercase tracking-wide ${localGana ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
            {clubNombreCorto(partido.clubLocal.nombre)}
          </span>
          <ClubBadge nombre={partido.clubLocal.nombre} size="sm" />
        </div>
        {conMarcador ? (
          <span className="shrink-0 font-mono text-lg font-extrabold tabular-nums">
            <span className={localGana ? "text-accent-orange" : "text-foreground"}>{partido.resultadoLocal ?? "-"}</span>
            <span className="px-1 text-muted/60">-</span>
            <span className={visitanteGana ? "text-accent-orange" : "text-foreground"}>{partido.resultadoVisitante ?? "-"}</span>
          </span>
        ) : (
          <span className="shrink-0 font-ui text-[10px] font-semibold text-muted/60">VS</span>
        )}
        <div className="flex min-w-0 items-center gap-2.5">
          <ClubBadge nombre={partido.clubVisitante.nombre} size="sm" />
          <span className={`truncate font-ui text-[13px] uppercase tracking-wide ${visitanteGana ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
            {clubNombreCorto(partido.clubVisitante.nombre)}
          </span>
        </div>
      </div>
      <div className="flex justify-end">
        <EstadoPill estado={partido.estado} />
      </div>
    </div>
  );
}

function MatchCenter({
  hero,
  countdownTarget,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
  countdownTarget: number | null;
}) {
  return (
    <section id="fecha" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -top-40 right-[-10rem] h-96 w-96 rounded-full bg-accent-orange/10 blur-[130px]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {hero.tipo === "EN_VIVO" && (
          <div className="rounded-3xl border border-success/30 bg-gradient-to-b from-surface to-background/80 p-6 sm:p-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-head text-2xl uppercase text-foreground sm:text-3xl">En vivo</span>
              <span className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 font-ui text-[11px] font-semibold uppercase tracking-wide text-success">
                <span className="live-halo h-1.5 w-1.5 rounded-full bg-success" />
                {hero.liveState.cuartoActivo ? `Cuarto ${hero.liveState.cuartoActivo}` : "Jugando"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-14">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
                <ClubBadge nombre={hero.partido.clubLocal.nombre} size="lg" />
                <span className="truncate font-ui text-sm font-semibold uppercase tracking-wide text-muted">
                  {clubNombreCorto(hero.partido.clubLocal.nombre)}
                </span>
              </div>
              <span className="shrink-0 font-mono text-6xl font-black tabular-nums text-foreground sm:text-7xl">
                {hero.liveState.marcadorLocal}
                <span className="px-2 text-border">:</span>
                {hero.liveState.marcadorVisitante}
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
                <ClubBadge nombre={hero.partido.clubVisitante.nombre} size="lg" />
                <span className="truncate font-ui text-sm font-semibold uppercase tracking-wide text-muted">
                  {clubNombreCorto(hero.partido.clubVisitante.nombre)}
                </span>
              </div>
            </div>
          </div>
        )}

        {hero.tipo === "PROXIMA_JORNADA" && (
          <div className="rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-background/80 p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-head text-3xl uppercase leading-none tracking-tight text-foreground sm:text-4xl">
                  Fecha {hero.jornada.numero}
                </span>
                <span className="font-ui text-sm uppercase tracking-wide text-muted">
                  {hero.jornada.fecha ? formatFechaCortaCL(hero.jornada.fecha) : "Fecha por confirmar"}
                </span>
              </div>
              {countdownTarget !== null && (
                <div className="w-full max-w-xs sm:w-64">
                  <Countdown targetMs={countdownTarget} />
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-background/40 px-3 sm:px-5">
              {hero.jornada.partidos.map((p) => (
                <MatchRow key={p.id} partido={p} />
              ))}
            </div>
          </div>
        )}

        {hero.tipo === "ULTIMOS_RESULTADOS" && (
          <div className="rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-background/80 p-6 sm:p-8">
            <div className="mb-5 flex flex-col gap-1">
              <span className="font-head text-3xl uppercase leading-none tracking-tight text-foreground sm:text-4xl">
                Fecha {hero.jornada.numero}
              </span>
              <span className="font-ui text-sm uppercase tracking-wide text-muted">Resultados</span>
            </div>
            <div className="rounded-2xl border border-border bg-background/40 px-3 sm:px-5">
              {hero.jornada.partidos.map((p) => (
                <MatchRow key={p.id} partido={p} />
              ))}
            </div>
          </div>
        )}

        {hero.tipo === "VACIO" && (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center">
            <p className="font-ui text-sm uppercase tracking-wide text-muted">
              Sin partidos cargados en la temporada 2026.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Tabla de posiciones
--------------------------------------------------------------------------- */

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.every((r) => r.pj === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center font-ui text-sm uppercase tracking-wide text-muted">
        La tabla se arma con cada acta.
      </div>
    );
  }
  const th = "px-3 py-3 font-ui text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-3 text-center font-mono text-sm tabular-nums text-foreground";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              <th className={th}>Club</th>
              <th className={`${th} text-center`}>PJ</th>
              <th className={`${th} text-center`}>PG</th>
              <th className={`${th} text-center`}>PP</th>
              <th className={`${th} text-center`}>PF</th>
              <th className={`${th} text-center`}>PC</th>
              <th className={`${th} text-center`}>DIF</th>
              <th className={`${th} text-center`}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.clubId}
                className={`border-b border-border last:border-0 hover:bg-white/[0.02] ${i === 0 ? "bg-white/[0.03]" : ""}`}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-4 text-center font-mono text-xs font-bold ${i === 0 ? "text-accent-orange" : "text-muted"}`}>
                      {i + 1}
                    </span>
                    <ClubBadge nombre={r.clubNombre} size="sm" />
                    <span className="whitespace-nowrap font-ui text-[13px] font-medium uppercase tracking-wide text-foreground">
                      {clubNombreCorto(r.clubNombre)}
                    </span>
                  </div>
                </td>
                <td className={td}>{r.pj}</td>
                <td className={td}>{r.pg}</td>
                <td className={td}>{r.pp}</td>
                <td className={td}>{r.pf}</td>
                <td className={td}>{r.pc}</td>
                <td className={`${td} ${r.dif < 0 ? "text-danger" : "text-foreground"}`}>
                  {r.dif > 0 ? `+${r.dif}` : r.dif}
                </td>
                <td className="px-3 py-3 text-center font-mono text-sm font-extrabold tabular-nums text-accent-orange">
                  {r.pts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Rail de anotadores
--------------------------------------------------------------------------- */

function AnotadoresRail({ rows }: { rows: TopScorerRow[] }) {
  return (
    <div id="anotadores">
      <h3 className="mb-5 flex items-center gap-3 font-head text-2xl uppercase leading-none tracking-tight text-foreground sm:text-3xl">
        <span className="h-5 w-1 rounded-full bg-accent-orange" />
        Anotadores
      </h3>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5 font-ui text-sm uppercase tracking-wide text-muted">
          Sin puntos registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((r, i) => (
            <div
              key={r.jugadorId}
              className={`flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0 ${i === 0 ? "bg-white/[0.03]" : ""}`}
            >
              <span className={`w-5 font-mono text-sm font-bold ${i === 0 ? "text-accent-orange" : "text-muted/70"}`}>
                {i + 1}
              </span>
              <ClubBadge nombre={r.clubNombre} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-ui text-[13px] font-semibold uppercase tracking-wide text-foreground">
                  {r.nombre}
                </div>
                <div className="truncate font-ui text-[11px] uppercase tracking-wide text-muted/70">
                  {clubNombreCorto(r.clubNombre)}
                </div>
              </div>
              <div className="text-right">
                <span className={`font-mono font-extrabold tabular-nums ${i === 0 ? "text-xl text-accent-orange" : "text-base text-foreground"}`}>
                  {r.puntosTotal}
                </span>
                <div className="font-ui text-[10px] uppercase tracking-wide text-muted/60">{r.promedio} ppp</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Resultados recientes (filas de marcador)
--------------------------------------------------------------------------- */

function ResultadosList({ partidos }: { partidos: PartidoResumen[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {partidos.map((p) => {
        const localGana = esGanador(p.resultadoLocal, p.resultadoVisitante);
        const visitanteGana = esGanador(p.resultadoVisitante, p.resultadoLocal);
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-4 last:border-0">
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <span className={`truncate font-ui text-[13.5px] uppercase tracking-wide ${localGana ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
                  {clubNombreCorto(p.clubLocal.nombre)}
                </span>
                <ClubBadge nombre={p.clubLocal.nombre} size="sm" />
              </div>
              <span className="font-mono text-lg font-extrabold tabular-nums text-foreground">
                <span className={localGana ? "text-accent-orange" : ""}>{p.resultadoLocal}</span>
                <span className="px-1.5 text-muted/60">-</span>
                <span className={visitanteGana ? "text-accent-orange" : ""}>{p.resultadoVisitante}</span>
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                <ClubBadge nombre={p.clubVisitante.nombre} size="sm" />
                <span className={`truncate font-ui text-[13.5px] uppercase tracking-wide ${visitanteGana ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
                  {clubNombreCorto(p.clubVisitante.nombre)}
                </span>
              </div>
            </div>
            {p.mvpNombre && (
              <span className="font-ui text-[11px] font-medium uppercase tracking-wide text-muted/70">
                MVP {p.mvpNombre}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Fixture (próximas fechas)
--------------------------------------------------------------------------- */

function FixtureFechas({ jornadas }: { jornadas: Awaited<ReturnType<typeof getProximasJornadas>> }) {
  if (jornadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center font-ui text-sm uppercase tracking-wide text-muted">
        Sin próximas fechas confirmadas.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {jornadas.map((j) => (
        <div key={j.numero} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 font-head text-lg text-accent-blue">
            {j.numero}
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-ui text-sm font-semibold uppercase tracking-wide text-foreground">Fecha {j.numero}</span>
              <span className="font-ui text-xs uppercase tracking-wide text-muted/70">
                {j.fecha ? formatFechaCortaCL(j.fecha) : "Por confirmar"}
              </span>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted">
              {j.finalizados}/{j.totalPartidos}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Clubes (directorio)
--------------------------------------------------------------------------- */

function ClubesDirectorio({
  clubes,
}: {
  clubes: { id: string; nombre: string; jugadores: number; posicion: number | null; pts: number | null; dif: number | null }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
      {clubes.map((c) => (
        <div key={c.id} className="flex items-center gap-3 bg-surface px-4 py-3.5">
          {c.posicion && <span className="w-4 shrink-0 text-center font-mono text-xs font-bold text-muted">{c.posicion}</span>}
          <ClubBadge nombre={c.nombre} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-ui text-[13.5px] font-semibold uppercase tracking-wide text-foreground">
              {clubNombreCorto(c.nombre)}
            </div>
            <div className="font-ui text-[11px] uppercase tracking-wide text-muted/70">{c.jugadores} jugadores</div>
          </div>
          {c.pts !== null && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm font-extrabold tabular-nums text-accent-orange">{c.pts} pts</div>
              {c.dif !== null && (
                <div className={`font-mono text-[11px] tabular-nums ${c.dif < 0 ? "text-danger" : "text-muted"}`}>
                  {c.dif > 0 ? `+${c.dif}` : c.dif}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Página
--------------------------------------------------------------------------- */

export default async function Home() {
  const [heroData, standings, topScorers, ultimosResultados, proximasJornadas, equipos] = await Promise.all([
    getHeroData(),
    getStandings(),
    getTopScorers(5),
    getUltimosResultados(6),
    getProximasJornadas(6),
    getEquipos(),
  ]);

  const hayEnVivo = heroData.tipo === "EN_VIVO";

  const countdownTarget =
    heroData.tipo === "PROXIMA_JORNADA"
      ? heroData.jornada.partidos
          .map((p) => p.fechaHora)
          .filter((f): f is Date => f !== null)
          .map((f) => new Date(f).getTime())
          .sort((a, b) => a - b)[0] ?? null
      : null;

  // Directorio de clubes ordenado por posición real (los que jugaron primero).
  const stById = new Map(standings.map((r) => [r.clubId, r]));
  const clubesDir = [...equipos]
    .map((e) => {
      const s = stById.get(e.id);
      const jugoAlgo = s && s.pj > 0;
      return {
        id: e.id,
        nombre: e.nombre,
        jugadores: e.jugadores,
        posicion: jugoAlgo ? standings.findIndex((r) => r.clubId === e.id) + 1 : null,
        pts: jugoAlgo ? s!.pts : null,
        dif: jugoAlgo ? s!.dif : null,
      };
    })
    .sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99) || a.nombre.localeCompare(b.nombre));

  // Evitar duplicar resultados: si el Match Center ya muestra la última jornada
  // jugada, no repetir la sección de resultados con esos mismos partidos.
  const mostrarResultados = heroData.tipo !== "ULTIMOS_RESULTADOS" && ultimosResultados.length > 0;

  return (
    <div className="landing-shell flex flex-1 flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-border bg-[rgba(5,7,10,0.72)] backdrop-blur-md">
        <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="font-head text-xl uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#fecha", label: "Fecha" },
              { href: "#tabla", label: "Tabla" },
              { href: "#anotadores", label: "Anotadores" },
              { href: "#resultados", label: "Resultados" },
              { href: "#clubes", label: "Clubes" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="rounded-full px-3.5 py-2 font-ui text-[13px] font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <span className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-2 font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className={`h-1.5 w-1.5 rounded-full bg-success ${hayEnVivo ? "live-halo" : ""}`} />
            <span className="hidden sm:inline">{hayEnVivo ? "En vivo" : "Temporada en curso"}</span>
          </span>
        </div>
      </header>

      <main id="top" className="flex flex-1 flex-col">
        <MatchCenter hero={heroData} countdownTarget={countdownTarget} />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-14 sm:px-6 sm:py-16">
          <section className="reveal-on-scroll grid grid-cols-1 gap-8 lg:grid-cols-8">
            <div className="lg:col-span-5">
              <SectionTitle id="tabla">Tabla</SectionTitle>
              <StandingsTable rows={standings} />
            </div>
            <div className="lg:col-span-3">
              <AnotadoresRail rows={topScorers} />
            </div>
          </section>

          {mostrarResultados && (
            <section className="reveal-on-scroll">
              <SectionTitle id="resultados">Resultados</SectionTitle>
              <ResultadosList partidos={ultimosResultados} />
            </section>
          )}

          <section className="reveal-on-scroll">
            <SectionTitle id="fixture">Fixture</SectionTitle>
            <FixtureFechas jornadas={proximasJornadas} />
          </section>

          <section className="reveal-on-scroll">
            <SectionTitle id="clubes">Clubes</SectionTitle>
            <ClubesDirectorio clubes={clubesDir} />
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 sm:px-6">
          <span className="font-head text-lg uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </span>
          <span className="font-ui text-[11px] uppercase tracking-wide text-muted/70">
            Resultados oficiales desde el acta de cada partido
          </span>
        </div>
      </footer>
    </div>
  );
}
