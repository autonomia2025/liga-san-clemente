import type { Metadata } from "next";
import { Countdown } from "@/components/public/countdown";
import { formatFechaCortaCL, formatHoraCortaCL } from "@/lib/fecha";
import { clubAbrev, clubGradient, clubNombreCorto } from "@/lib/public/display";
import { getStandings, type StandingRow } from "@/lib/public/standings";
import { getTopScorers, type TopScorerRow } from "@/lib/public/rankings";
import {
  getHeroData,
  getPartidosEnVivo,
  getUltimosResultados,
  getEquipos,
  getMvpsRecientes,
  getResumenEditorial,
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
   Piezas compartidas
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-ui text-[13px] font-semibold uppercase tracking-[0.1em] text-accent-orange">
      <span className="h-0.5 w-4 rounded-full bg-accent-orange" />
      {children}
    </span>
  );
}

function SectionHead({
  title,
  meta,
  eyebrow,
  id,
}: {
  title: string;
  meta?: string;
  eyebrow?: string;
  id?: string;
}) {
  return (
    <div id={id} className="mb-8 flex scroll-mt-24 flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-head text-3xl uppercase leading-none tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
          {title}
        </h2>
      </div>
      {meta && <p className="max-w-md text-sm text-muted">{meta}</p>}
    </div>
  );
}

function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 p-10">
      <p className="max-w-sm text-center text-sm text-muted">{mensaje}</p>
    </div>
  );
}

function esGanador(propio: number | null, rival: number | null): boolean {
  return propio !== null && rival !== null && propio > rival;
}

/* ---------------------------------------------------------------------------
   Hero
--------------------------------------------------------------------------- */

function ScoreboardMatchRow({ partido }: { partido: PartidoResumen }) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
      <span className="w-11 shrink-0 font-mono text-[13px] text-muted">
        {partido.fechaHora ? formatHoraCortaCL(partido.fechaHora) : "·"}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate font-ui text-xs font-medium uppercase tracking-wide text-muted">
            {clubNombreCorto(partido.clubLocal.nombre)}
          </span>
          <ClubBadge nombre={partido.clubLocal.nombre} size="xs" />
        </div>
        <span className="shrink-0 font-ui text-[10px] font-semibold text-muted/70">VS</span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ClubBadge nombre={partido.clubVisitante.nombre} size="xs" />
          <span className="truncate font-ui text-xs font-medium uppercase tracking-wide text-muted">
            {clubNombreCorto(partido.clubVisitante.nombre)}
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroScoreboard({
  hero,
  countdownTarget,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
  countdownTarget: number | null;
}) {
  return (
    <div className="sb-frame relative rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-background/90 p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]">
      {hero.tipo === "EN_VIVO" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-head text-lg uppercase text-foreground">En vivo</span>
              <span className="font-ui text-xs text-muted">
                {hero.liveState.cuartoActivo ? `Cuarto ${hero.liveState.cuartoActivo}` : "Partido en curso"}
              </span>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 font-ui text-[11px] font-semibold uppercase tracking-wide text-success">
              <span className="live-halo h-1.5 w-1.5 rounded-full bg-success" />
              Live
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 py-2 sm:gap-8">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <ClubBadge nombre={hero.partido.clubLocal.nombre} size="lg" />
              <span className="truncate font-ui text-xs font-semibold uppercase tracking-wide text-muted">
                {clubNombreCorto(hero.partido.clubLocal.nombre)}
              </span>
            </div>
            <span className="shrink-0 font-mono text-5xl font-black tabular-nums text-foreground sm:text-6xl">
              {hero.liveState.marcadorLocal}
              <span className="px-1.5 text-border sm:px-2">:</span>
              {hero.liveState.marcadorVisitante}
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <ClubBadge nombre={hero.partido.clubVisitante.nombre} size="lg" />
              <span className="truncate font-ui text-xs font-semibold uppercase tracking-wide text-muted">
                {clubNombreCorto(hero.partido.clubVisitante.nombre)}
              </span>
            </div>
          </div>
        </>
      )}

      {hero.tipo === "PROXIMA_JORNADA" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-head text-lg uppercase text-foreground">Próxima jornada</span>
              <span className="font-ui text-xs text-muted">
                {hero.jornada.fecha ? formatFechaCortaCL(hero.jornada.fecha) : "Fecha por confirmar"}
              </span>
            </div>
            <span className="rounded-full border border-accent-orange/35 bg-accent-orange/[0.14] px-3 py-1.5 font-ui text-[11px] font-semibold uppercase tracking-wide text-accent-orange">
              Jornada {hero.jornada.numero}
            </span>
          </div>
          {countdownTarget !== null && (
            <div className="mb-5">
              <Countdown targetMs={countdownTarget} />
            </div>
          )}
          <div>
            {hero.jornada.partidos.slice(0, 4).map((p) => (
              <ScoreboardMatchRow key={p.id} partido={p} />
            ))}
          </div>
        </>
      )}

      {hero.tipo === "ULTIMOS_RESULTADOS" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-head text-lg uppercase text-foreground">Resultados</span>
              <span className="font-ui text-xs text-muted">Jornada {hero.jornada.numero}</span>
            </div>
          </div>
          <div className="flex flex-col">
            {hero.jornada.partidos.slice(0, 4).map((p) => {
              const localGana = esGanador(p.resultadoLocal, p.resultadoVisitante);
              return (
                <div key={p.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border py-2.5 font-ui text-xs uppercase tracking-wide first:border-t-0">
                  <span className={`truncate text-right ${localGana ? "font-semibold text-foreground" : "text-muted"}`}>
                    {clubNombreCorto(p.clubLocal.nombre)}
                  </span>
                  <span className="px-2 font-mono text-sm font-bold tabular-nums text-accent-orange">
                    {p.resultadoLocal} : {p.resultadoVisitante}
                  </span>
                  <span className={`truncate ${!localGana ? "font-semibold text-foreground" : "text-muted"}`}>
                    {clubNombreCorto(p.clubVisitante.nombre)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hero.tipo === "VACIO" && (
        <p className="text-sm text-muted">
          La temporada 2026 todavía no tiene partidos cargados. Muy pronto vas a poder seguir cada
          fecha acá.
        </p>
      )}
    </div>
  );
}

function HeroSection({
  hero,
  countdownTarget,
  temporadaLabel,
  stats,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
  countdownTarget: number | null;
  temporadaLabel: string;
  stats: { clubes: number; jugadores: number; jornada: string };
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -top-40 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-accent-orange/15 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-40 left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-accent-blue/15 blur-[110px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col gap-5">
          <Eyebrow>Temporada 2026 · {temporadaLabel}</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border-strong bg-surface-2 px-3.5 py-1.5 font-ui text-sm font-semibold uppercase tracking-wide text-foreground">
              LBSC<span className="text-accent-orange">·</span>2026
            </span>
            <span className="text-sm text-muted">Liga de Básquetbol San Clemente</span>
          </div>
          <h1 className="font-head text-5xl uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Vive la Liga San Clemente{" "}
            <span className="bg-gradient-to-r from-amber-300 to-accent-orange bg-clip-text text-transparent">
              en tiempo real.
            </span>
          </h1>
          <p className="max-w-md text-base text-muted sm:text-lg">
            Resultados, fixture, rankings y figuras de la casa del básquet san clementino.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#fixture"
              className="rounded-full bg-gradient-to-br from-accent-orange to-amber-500 px-6 py-3 text-sm font-bold text-[#0a0602] shadow-glow-orange transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              Ver fixture
            </a>
            <a
              href="#goleadores"
              className="rounded-full border border-border-strong bg-white/[0.03] px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/[0.07] active:scale-95"
            >
              Ver rankings
            </a>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { valor: String(stats.clubes), label: "Clubes" },
              { valor: String(stats.jugadores), label: "Jugadores" },
              { valor: stats.jornada, label: "Jornada" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-mono text-2xl font-extrabold tabular-nums text-foreground">{s.valor}</span>
                <span className="font-ui text-xs font-medium uppercase tracking-wide text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <HeroScoreboard hero={hero} countdownTarget={countdownTarget} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Stat band
--------------------------------------------------------------------------- */

function StatBand({
  equipos,
  jugadores,
  partidosJugados,
  maxAnotador,
}: {
  equipos: number;
  jugadores: number;
  partidosJugados: number;
  maxAnotador: { nombre: string; puntos: number } | null;
}) {
  const stats = [
    { valor: String(equipos), texto: false, label: "Clubes participantes" },
    { valor: String(jugadores), texto: false, label: "Jugadores inscritos" },
    { valor: String(partidosJugados), texto: false, label: "Partidos jugados" },
    maxAnotador
      ? { valor: `${maxAnotador.nombre} · ${maxAnotador.puntos} pts`, texto: true, label: "Máximo anotador" }
      : { valor: "Aún sin datos", texto: true, label: "Máximo anotador" },
  ];
  return (
    <div className="border-y border-border bg-bg-soft">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-y-7 px-4 py-9 sm:px-6 lg:grid-cols-4 lg:gap-0">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1.5 lg:border-l lg:border-border lg:px-6 ${i === 0 ? "lg:border-l-0 lg:pl-0" : ""}`}
          >
            <span className={`font-black tabular-nums text-foreground ${s.texto ? "truncate font-sans text-lg" : "font-mono text-3xl sm:text-4xl"}`}>
              {s.valor}
            </span>
            <span className="font-ui text-xs font-medium uppercase tracking-wide text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Match card (por jugarse)
--------------------------------------------------------------------------- */

function MatchCard({ partido }: { partido: PartidoResumen }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 transition-all duration-200 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_24px_50px_-22px_rgba(0,0,0,0.6)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-accent-orange">
          {partido.fechaHora ? formatHoraCortaCL(partido.fechaHora) : "Por confirmar"}
        </span>
        <span className="rounded-full border border-border-strong px-2.5 py-1 font-ui text-[10.5px] font-semibold uppercase tracking-wide text-muted">
          Programado
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <ClubBadge nombre={partido.clubLocal.nombre} size="lg" />
          <span className="font-ui text-xs font-medium uppercase leading-tight tracking-wide text-muted">
            {clubNombreCorto(partido.clubLocal.nombre)}
          </span>
        </div>
        <span className="font-ui text-xs font-bold text-muted/70">VS</span>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <ClubBadge nombre={partido.clubVisitante.nombre} size="lg" />
          <span className="font-ui text-xs font-medium uppercase leading-tight tracking-wide text-muted">
            {clubNombreCorto(partido.clubVisitante.nombre)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Tabla de posiciones
--------------------------------------------------------------------------- */

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.every((r) => r.pj === 0)) {
    return <EstadoVacio mensaje="La tabla de posiciones se arma a medida que se juegan y cierran partidos." />;
  }
  const th = "px-3.5 py-3.5 font-ui text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3.5 py-3.5 text-center font-mono text-sm tabular-nums text-foreground";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
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
            {rows.map((r, i) => {
              const top3 = i < 3;
              return (
                <tr
                  key={r.clubId}
                  className={`border-b border-border transition-colors last:border-0 hover:bg-white/[0.02] ${
                    i === 0 ? "bg-gradient-to-r from-accent-orange/[0.12] to-transparent" : ""
                  }`}
                >
                  <td className="px-3.5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-extrabold ${
                          i === 0
                            ? "bg-accent-orange text-[#0a0602]"
                            : top3
                              ? "bg-surface-2 text-foreground ring-1 ring-border-strong"
                              : "bg-surface-2 text-muted ring-1 ring-border"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <ClubBadge nombre={r.clubNombre} size="sm" />
                      <span className="whitespace-nowrap font-ui text-[13.5px] font-medium uppercase tracking-wide text-foreground">
                        {clubNombreCorto(r.clubNombre)}
                      </span>
                    </div>
                  </td>
                  <td className={td}>{r.pj}</td>
                  <td className={td}>{r.pg}</td>
                  <td className={td}>{r.pp}</td>
                  <td className={td}>{r.pf}</td>
                  <td className={td}>{r.pc}</td>
                  <td className={`${td} font-semibold ${r.dif < 0 ? "text-danger" : "text-foreground"}`}>
                    {r.dif > 0 ? `+${r.dif}` : r.dif}
                  </td>
                  <td className="px-3.5 py-3.5 text-center font-mono text-[15px] font-extrabold tabular-nums text-accent-orange">
                    {r.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-3.5 font-ui text-[11px] uppercase tracking-wide text-muted/70">
        <span>PJ jugados</span><span>PG ganados</span><span>PP perdidos</span>
        <span>PF a favor</span><span>PC en contra</span><span>DIF diferencia</span><span>PTS puntos</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Leaderboard de anotadores
--------------------------------------------------------------------------- */

function TopScorers({ rows }: { rows: TopScorerRow[] }) {
  if (rows.length === 0) {
    return <EstadoVacio mensaje="Los goleadores de la temporada se irán mostrando a medida que se registren puntos." />;
  }
  const [lider, ...resto] = rows;
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
      {lider && (
        <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl border border-border-strong bg-gradient-to-br from-surface-2 to-surface p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.28),transparent_70%)]" />
          <span className="relative flex items-center gap-2 font-ui text-xs font-semibold uppercase tracking-wider text-accent-orange">
            Líder de anotación
          </span>
          <div className="relative">
            <div className="font-head text-4xl uppercase leading-none tracking-tight text-foreground lg:text-5xl">
              {lider.nombre}
            </div>
            <div className="mt-2 font-ui text-sm font-medium uppercase tracking-wide text-muted">
              {clubNombreCorto(lider.clubNombre)}
              {lider.numeroCamiseta !== null ? ` · #${lider.numeroCamiseta}` : ""}
            </div>
          </div>
          <div className="relative flex items-baseline gap-3">
            <span className="font-mono text-6xl font-black tabular-nums text-foreground">{lider.puntosTotal}</span>
            <span className="font-ui text-xs font-semibold uppercase tracking-wide text-muted">
              puntos · {lider.promedio} PPP
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {resto.map((r, i) => (
          <div
            key={r.jugadorId}
            className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3 transition-all duration-150 hover:translate-x-1 hover:border-border-strong"
          >
            <span className="w-5 font-mono text-sm font-extrabold text-muted/70">{String(i + 2).padStart(2, "0")}</span>
            <ClubBadge nombre={r.clubNombre} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-ui text-[13.5px] font-semibold uppercase tracking-wide text-foreground">
                {r.nombre}
              </div>
              <div className="truncate font-ui text-[11px] uppercase tracking-wide text-muted/70">
                {clubNombreCorto(r.clubNombre)}
              </div>
            </div>
            <span className="font-mono text-lg font-extrabold tabular-nums text-accent-orange">{r.puntosTotal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Resultados (scorecards)
--------------------------------------------------------------------------- */

function ResultCard({ partido }: { partido: PartidoResumen }) {
  const localGana = esGanador(partido.resultadoLocal, partido.resultadoVisitante);
  const visitanteGana = esGanador(partido.resultadoVisitante, partido.resultadoLocal);
  const fila = (nombre: string, score: number | null, gana: boolean) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex min-w-0 items-center gap-3">
        <ClubBadge nombre={nombre} size="sm" />
        <span className={`truncate font-ui text-[13.5px] uppercase tracking-wide ${gana ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
          {clubNombreCorto(nombre)}
        </span>
      </div>
      <span className={`font-mono text-[22px] font-extrabold tabular-nums ${gana ? "text-accent-orange" : "text-muted/70"}`}>
        {score ?? "-"}
      </span>
    </div>
  );
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 transition-all duration-200 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1 hover:border-border-strong">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-muted/70">Finalizado</span>
        {partido.mvpNombre && (
          <span className="font-ui text-[11px] font-semibold uppercase tracking-wide text-accent-orange">
            MVP · {partido.mvpNombre}
          </span>
        )}
      </div>
      {fila(partido.clubLocal.nombre, partido.resultadoLocal, localGana)}
      <div className="my-0.5 h-px bg-border" />
      {fila(partido.clubVisitante.nombre, partido.resultadoVisitante, visitanteGana)}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   MVPs
--------------------------------------------------------------------------- */

function MvpsGrid({ mvps }: { mvps: Awaited<ReturnType<typeof getMvpsRecientes>> }) {
  if (mvps.length === 0) {
    return <EstadoVacio mensaje="Los MVPs se irán destacando a medida que avance la temporada." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {mvps.map((m, i) => (
        <div
          key={`${m.jugadorNombre}-${i}`}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-2 to-surface p-6 transition-all duration-200 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1.5 hover:border-accent-orange/40"
        >
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-300 to-accent-orange px-2.5 py-1 font-ui text-[10.5px] font-bold uppercase tracking-wider text-[#0a0602]">
            MVP
          </span>
          <div className="mt-4">
            <ClubBadge nombre={m.clubNombre} size="lg" />
          </div>
          <div className="mt-4 font-head text-2xl uppercase leading-none tracking-tight text-foreground">
            {m.jugadorNombre}
          </div>
          <div className="mt-1.5 font-ui text-xs font-medium uppercase tracking-wide text-muted">
            {clubNombreCorto(m.clubNombre)} · Jornada {m.jornadaNumero}
          </div>
          <p className="mt-3.5 border-t border-border pt-3.5 text-xs text-muted/80">{m.resultado}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Equipos
--------------------------------------------------------------------------- */

function EquiposGrid({
  equipos,
}: {
  equipos: { id: string; nombre: string; jugadores: number; posicion: number | null }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {equipos.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-5 transition-all duration-200 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1 hover:border-border-strong"
        >
          <ClubBadge nombre={e.nombre} size="lg" />
          <div className="min-w-0">
            <div className="font-ui text-[15px] font-semibold uppercase leading-tight tracking-wide text-foreground">
              {clubNombreCorto(e.nombre)}
            </div>
            <div className="mt-1 font-ui text-[11px] uppercase tracking-wide text-muted/70">
              {e.posicion ? `${e.posicion}º · ` : ""}{e.jugadores} jugadores
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Resumen editorial
--------------------------------------------------------------------------- */

function ResumenEditorial({
  resumen,
}: {
  resumen: Awaited<ReturnType<typeof getResumenEditorial>>;
}) {
  if (!resumen) {
    return <EstadoVacio mensaje="El resumen editorial de la jornada aparecerá acá apenas se jueguen los primeros partidos." />;
  }
  const bloques = [
    resumen.partidoMasCerrado && { label: "Más cerrado", valor: resumen.partidoMasCerrado.texto, detalle: `Por ${resumen.partidoMasCerrado.diferencia} pts, el duelo más apretado de la fecha.` },
    resumen.mayorDiferencia && { label: "Mayor diferencia", valor: resumen.mayorDiferencia.texto, detalle: `La diferencia más amplia de la jornada, +${resumen.mayorDiferencia.diferencia}.` },
    resumen.topAnotadorJornada && { label: "Figura de la fecha", valor: resumen.topAnotadorJornada.texto, detalle: `${resumen.topAnotadorJornada.puntos} pts en el partido.` },
  ].filter((b): b is { label: string; valor: string; detalle: string } => Boolean(b));

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
      {bloques.map((b, i) => (
        <div key={b.label} className="bg-surface p-6">
          <span className="font-ui text-xs font-semibold uppercase tracking-wide text-accent-orange">
            {String(i + 1).padStart(2, "0")} · {b.label}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            <b className="font-semibold text-foreground">{b.valor}.</b> {b.detalle}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Página
--------------------------------------------------------------------------- */

export default async function Home() {
  const [heroData, partidosEnVivo, ultimosResultados, standings, topScorers, equipos, mvps, resumen, proximasJornadas] =
    await Promise.all([
      getHeroData(),
      getPartidosEnVivo(),
      getUltimosResultados(6),
      getStandings(),
      getTopScorers(8),
      getEquipos(),
      getMvpsRecientes(4),
      getResumenEditorial(),
      getProximasJornadas(4),
    ]);

  const hayEnVivo = partidosEnVivo.length > 0;
  const partidosProximos: PartidoResumen[] =
    heroData.tipo === "PROXIMA_JORNADA" ? heroData.jornada.partidos : [];

  // Estado real de la liga (nada inventado).
  const totalJugadores = equipos.reduce((acc, e) => acc + e.jugadores, 0);
  const partidosJugados = Math.round(standings.reduce((acc, r) => acc + r.pj, 0) / 2);
  const maxAnotador = topScorers[0]
    ? { nombre: topScorers[0].nombre, puntos: topScorers[0].puntosTotal }
    : null;

  // Cuenta regresiva: primer partido (con horario) de la próxima jornada.
  const countdownTarget =
    heroData.tipo === "PROXIMA_JORNADA"
      ? heroData.jornada.partidos
          .map((p) => p.fechaHora)
          .filter((f): f is Date => f !== null)
          .map((f) => new Date(f).getTime())
          .sort((a, b) => a - b)[0] ?? null
      : null;

  const jornadaLabel =
    heroData.tipo === "PROXIMA_JORNADA"
      ? `J${heroData.jornada.numero}`
      : heroData.tipo === "ULTIMOS_RESULTADOS"
        ? `J${heroData.jornada.numero}`
        : hayEnVivo
          ? "Hoy"
          : "-";
  const temporadaLabel =
    heroData.tipo === "EN_VIVO"
      ? "En juego ahora"
      : heroData.tipo === "PROXIMA_JORNADA"
        ? `Jornada ${heroData.jornada.numero}`
        : "Liga San Clemente";

  // Posición real por club (solo con partidos jugados) para el meta de equipos.
  const posPorClub = new Map<string, number>();
  standings.forEach((r, i) => {
    if (r.pj > 0) posPorClub.set(r.clubId, i + 1);
  });
  const equiposConPos = [...equipos]
    .map((e) => ({ id: e.id, nombre: e.nombre, jugadores: e.jugadores, posicion: posPorClub.get(e.id) ?? null }))
    .sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99) || a.nombre.localeCompare(b.nombre));

  const tablaMeta =
    standings[0] && standings[0].pj > 0
      ? `${clubNombreCorto(standings[0].clubNombre)} lidera la tabla con ${standings[0].pts} pts.`
      : "Victoria 2 pts, derrota 1 pt.";

  return (
    <div className="landing-shell flex flex-1 flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-border bg-[rgba(5,7,10,0.72)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="font-head text-xl uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#fixture", label: "Fixture" },
              { href: "#tabla", label: "Tabla" },
              { href: "#goleadores", label: "Rankings" },
              { href: "#resultados", label: "Resultados" },
              { href: "#equipos", label: "Equipos" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 font-ui text-[13.5px] font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <span className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-2 font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${hayEnVivo ? "live-halo bg-success" : "bg-success"}`} />
            <span className="hidden sm:inline">{hayEnVivo ? "En vivo" : "Temporada en curso"}</span>
          </span>
        </div>
      </header>

      <main id="top" className="flex flex-1 flex-col">
        <HeroSection
          hero={heroData}
          countdownTarget={countdownTarget}
          temporadaLabel={temporadaLabel}
          stats={{ clubes: equipos.length, jugadores: totalJugadores, jornada: jornadaLabel }}
        />

        <StatBand
          equipos={equipos.length}
          jugadores={totalJugadores}
          partidosJugados={partidosJugados}
          maxAnotador={maxAnotador}
        />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 py-16 sm:px-6 sm:py-20 lg:gap-24">
          {(hayEnVivo || partidosProximos.length > 0) && (
            <section className="reveal-on-scroll" id="fixture">
              <SectionHead
                eyebrow="Fixture"
                title={hayEnVivo ? "Partidos en vivo" : "Próxima jornada"}
                meta={
                  hayEnVivo
                    ? "Seguí el marcador en tiempo real."
                    : heroData.tipo === "PROXIMA_JORNADA" && heroData.jornada.fecha
                      ? `${formatFechaCortaCL(heroData.jornada.fecha)} · Jornada ${heroData.jornada.numero}`
                      : undefined
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {hayEnVivo
                  ? partidosEnVivo.map((p) => <ResultCard key={p.id} partido={p} />)
                  : partidosProximos.map((p) => <MatchCard key={p.id} partido={p} />)}
              </div>
            </section>
          )}

          <section className="reveal-on-scroll" id="tabla">
            <SectionHead title="Tabla de posiciones" meta={tablaMeta} />
            <StandingsTable rows={standings} />
          </section>

          <section className="reveal-on-scroll" id="goleadores">
            <SectionHead title="Top anotadores" meta="Líderes de puntos de la temporada 2026." />
            <TopScorers rows={topScorers} />
          </section>

          <section className="reveal-on-scroll" id="resultados">
            <SectionHead title="Últimos resultados" meta="Así se jugó en la Liga San Clemente." />
            {ultimosResultados.length === 0 ? (
              <EstadoVacio mensaje="Todavía no hay partidos finalizados en la temporada 2026." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ultimosResultados.map((p) => (
                  <ResultCard key={p.id} partido={p} />
                ))}
              </div>
            )}
          </section>

          <section className="reveal-on-scroll">
            <SectionHead title="Figuras de la fecha" meta="Los MVPs que eligió la mesa en cada partido." />
            <MvpsGrid mvps={mvps} />
          </section>

          <section className="reveal-on-scroll" id="equipos">
            <SectionHead title="Equipos participantes" meta={`Los ${equipos.length} clubes de la temporada 2026.`} />
            <EquiposGrid equipos={equiposConPos} />
          </section>

          <section className="reveal-on-scroll">
            <SectionHead eyebrow="Resumen de jornada" title="Lo que dejó la fecha" />
            <ResumenEditorial resumen={resumen} />
          </section>

          <section className="reveal-on-scroll">
            <SectionHead title="Fixture de la liga" meta="Cómo viene el calendario por jornada." />
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {proximasJornadas.length === 0 ? (
                <div className="p-6"><EstadoVacio mensaje="El fixture se actualizará apenas se confirmen las próximas fechas." /></div>
              ) : (
                proximasJornadas.map((j) => {
                  const progreso = j.totalPartidos > 0 ? Math.round((j.finalizados / j.totalPartidos) * 100) : 0;
                  return (
                    <div key={j.numero} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 font-head text-lg text-accent-blue">
                        {j.numero}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-ui text-sm font-semibold uppercase tracking-wide text-foreground">Jornada {j.numero}</span>
                          <span className="text-xs text-muted">{j.fecha ? formatFechaCortaCL(j.fecha) : "Por confirmar"}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-accent-orange" style={{ width: `${progreso}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-semibold text-muted">{j.finalizados}/{j.totalPartidos}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-bg-soft to-background">
          <div className="pointer-events-none absolute -top-52 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.12),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <h2 className="font-head text-4xl uppercase leading-[1.02] tracking-tight text-foreground sm:text-6xl">
              La casa del <span className="text-accent-orange">básquet</span> san clementino.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              La Liga de Básquetbol San Clemente reúne a clubes, jugadores y familias en una
              temporada que ahora también se vive con resultados, estadísticas y seguimiento en
              tiempo real.
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-11 sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="font-head text-lg uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </span>
          <span className="text-xs text-muted">Liga de Básquetbol San Clemente</span>
        </div>
        <span className="font-ui text-xs font-medium uppercase tracking-wide text-muted/70">
          Básquet local. Nivel profesional.
        </span>
      </footer>
    </div>
  );
}
