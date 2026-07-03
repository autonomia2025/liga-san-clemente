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
      className="mb-6 flex scroll-mt-24 items-center gap-3 font-head text-2xl uppercase leading-none tracking-tight text-foreground sm:text-3xl"
    >
      <span className="h-5 w-1 rounded-full bg-accent-orange" />
      {children}
    </h2>
  );
}

function esGanador(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && a > b;
}

function marcadorTexto(p: PartidoResumen): string {
  return `${clubNombreCorto(p.clubLocal.nombre)} ${p.resultadoLocal} - ${p.resultadoVisitante} ${clubNombreCorto(
    p.clubVisitante.nombre,
  )}`;
}

/* ---------------------------------------------------------------------------
   Hero + scoreboard
--------------------------------------------------------------------------- */

function FixtureRow({ partido }: { partido: PartidoResumen }) {
  return (
    <div className="grid grid-cols-[3rem_1fr] items-center gap-3 border-t border-border py-2.5 first:border-t-0">
      <span className="font-mono text-[13px] text-muted">
        {partido.fechaHora ? formatHoraCortaCL(partido.fechaHora) : "s/h"}
      </span>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex items-center justify-end gap-2 truncate font-ui text-xs font-medium uppercase tracking-wide text-muted">
          <span className="truncate">{clubNombreCorto(partido.clubLocal.nombre)}</span>
          <ClubBadge nombre={partido.clubLocal.nombre} size="xs" />
        </span>
        <span className="font-ui text-[10px] font-semibold text-muted/60">VS</span>
        <span className="flex items-center gap-2 truncate font-ui text-xs font-medium uppercase tracking-wide text-muted">
          <ClubBadge nombre={partido.clubVisitante.nombre} size="xs" />
          <span className="truncate">{clubNombreCorto(partido.clubVisitante.nombre)}</span>
        </span>
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
    <div className="sb-frame relative rounded-3xl border border-border-strong bg-gradient-to-b from-surface to-background/90 p-6">
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
              <span className="font-head text-lg uppercase text-foreground">Próxima fecha</span>
              <span className="font-ui text-xs text-muted">
                Jornada {hero.jornada.numero}
                {hero.jornada.fecha ? ` · ${formatFechaCortaCL(hero.jornada.fecha)}` : ""}
              </span>
            </div>
            <span className="rounded-full border border-accent-orange/35 bg-accent-orange/[0.12] px-3 py-1.5 font-ui text-[11px] font-semibold uppercase tracking-wide text-accent-orange">
              Fixture
            </span>
          </div>
          {countdownTarget !== null && (
            <div className="mb-5">
              <Countdown targetMs={countdownTarget} />
            </div>
          )}
          <div>
            {hero.jornada.partidos.map((p) => (
              <FixtureRow key={p.id} partido={p} />
            ))}
          </div>
        </>
      )}

      {hero.tipo === "ULTIMOS_RESULTADOS" && (
        <>
          <div className="mb-5 flex flex-col">
            <span className="font-head text-lg uppercase text-foreground">Resultados</span>
            <span className="font-ui text-xs text-muted">Jornada {hero.jornada.numero}</span>
          </div>
          <div>
            {hero.jornada.partidos.map((p) => {
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
        <p className="text-sm text-muted">La temporada 2026 todavía no tiene partidos cargados.</p>
      )}
    </div>
  );
}

function HeroSection({
  hero,
  countdownTarget,
  jornadaLabel,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
  countdownTarget: number | null;
  jornadaLabel: string;
}) {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -top-40 right-[-8rem] h-96 w-96 rounded-full bg-accent-orange/10 blur-[120px]" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col gap-5">
          <span className="font-ui text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-orange">
            Temporada 2026 · {jornadaLabel}
          </span>
          <h1 className="font-head text-5xl uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Vive la Liga San Clemente{" "}
            <span className="bg-gradient-to-r from-amber-300 to-accent-orange bg-clip-text text-transparent">
              en tiempo real.
            </span>
          </h1>
          <p className="max-w-md text-base text-muted">
            Resultados, fixture y posiciones oficiales de la Liga de Básquetbol San Clemente.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#tabla"
              className="rounded-full bg-gradient-to-br from-accent-orange to-amber-500 px-6 py-3 font-ui text-sm font-bold uppercase tracking-wide text-[#0a0602] transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              Posiciones
            </a>
            <a
              href="#resultados"
              className="rounded-full border border-border-strong bg-white/[0.03] px-6 py-3 font-ui text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-white/25 active:scale-95"
            >
              Resultados
            </a>
          </div>
        </div>

        <HeroScoreboard hero={hero} countdownTarget={countdownTarget} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Estado de la liga (panel editorial)
--------------------------------------------------------------------------- */

function MiniDato({ label, valor, ultimo }: { label: string; valor: string; ultimo?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${ultimo ? "" : "border-b border-border"}`}>
      <span className="font-ui text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
      <span className="truncate text-right font-ui text-sm font-semibold uppercase tracking-wide text-foreground">
        {valor}
      </span>
    </div>
  );
}

function EstadoLiga({
  lider,
  maxAnotador,
  proximaFecha,
  partidosJugados,
  equipos,
  jugadores,
  ultimoResultado,
}: {
  lider: StandingRow | null;
  maxAnotador: { nombre: string; puntos: number } | null;
  proximaFecha: string | null;
  partidosJugados: number;
  equipos: number;
  jugadores: number;
  ultimoResultado: string | null;
}) {
  return (
    <section className="reveal-on-scroll">
      <SectionTitle>Estado de la liga</SectionTitle>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-5">
        <div className="flex flex-col justify-center gap-3 bg-surface p-6 sm:p-8 lg:col-span-2">
          <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-accent-orange">
            {lider ? "Líder de la tabla" : "Temporada 2026"}
          </span>
          {lider ? (
            <>
              <div className="flex items-center gap-3">
                <ClubBadge nombre={lider.clubNombre} size="lg" />
                <span className="font-head text-3xl uppercase leading-none tracking-tight text-foreground sm:text-4xl">
                  {clubNombreCorto(lider.clubNombre)}
                </span>
              </div>
              <span className="font-mono text-sm tabular-nums text-muted">
                {lider.pg} PG · {lider.pp} PP · <span className="font-bold text-accent-orange">{lider.pts} PTS</span>
              </span>
            </>
          ) : (
            <span className="font-head text-2xl uppercase leading-tight tracking-tight text-foreground">
              La competencia está por comenzar
            </span>
          )}
        </div>
        <div className="bg-surface p-6 sm:px-8 lg:col-span-3">
          <MiniDato label="Máximo anotador" valor={maxAnotador ? `${maxAnotador.nombre} · ${maxAnotador.puntos} pts` : "Sin datos"} />
          <MiniDato label="Próxima fecha" valor={proximaFecha ?? "Por confirmar"} />
          <MiniDato label="Partidos jugados" valor={String(partidosJugados)} />
          <MiniDato label="Clubes · jugadores" valor={`${equipos} · ${jugadores}`} />
          <MiniDato label="Último resultado" valor={ultimoResultado ?? "Sin resultados"} ultimo />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Tabla de posiciones + rail de líderes
--------------------------------------------------------------------------- */

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.every((r) => r.pj === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
        La tabla se arma a medida que se cierran actas.
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
                    <span
                      className={`w-4 text-center font-mono text-xs font-bold ${i === 0 ? "text-accent-orange" : "text-muted"}`}
                    >
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

function LideresRail({
  topScorers,
  mvp,
  dato,
}: {
  topScorers: TopScorerRow[];
  mvp: { jugadorNombre: string; clubNombre: string; jornadaNumero: number } | null;
  dato: { label: string; valor: string } | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div id="lideres">
        <h3 className="mb-3 font-ui text-xs font-semibold uppercase tracking-wider text-muted">Anotadores</h3>
        {topScorers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            Sin puntos registrados todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {topScorers.map((r, i) => (
              <div
                key={r.jugadorId}
                className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 ${i === 0 ? "bg-white/[0.03]" : ""}`}
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
                <span className={`font-mono font-extrabold tabular-nums ${i === 0 ? "text-lg text-accent-orange" : "text-foreground"}`}>
                  {r.puntosTotal}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(mvp || dato) && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {mvp && (
            <div className="flex flex-col gap-1 border-b border-border p-5">
              <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-accent-orange">
                MVP · Jornada {mvp.jornadaNumero}
              </span>
              <span className="font-head text-xl uppercase leading-none tracking-tight text-foreground">
                {mvp.jugadorNombre}
              </span>
              <span className="font-ui text-xs uppercase tracking-wide text-muted">{clubNombreCorto(mvp.clubNombre)}</span>
            </div>
          )}
          {dato && (
            <div className="flex flex-col gap-1 p-5">
              <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-muted">{dato.label}</span>
              <span className="font-ui text-sm font-semibold uppercase tracking-wide text-foreground">{dato.valor}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Últimos resultados (lista de marcadores)
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
   Clubes (directorio compacto)
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
   Historias de la fecha (editorial: 1 grande + 2 chicas)
--------------------------------------------------------------------------- */

function HistoriasFecha({
  resumen,
}: {
  resumen: Awaited<ReturnType<typeof getResumenEditorial>>;
}) {
  if (!resumen) return null;
  const principal = resumen.partidoMasCerrado
    ? { label: "Partido más cerrado", valor: resumen.partidoMasCerrado.texto, dif: `Diferencia de ${resumen.partidoMasCerrado.diferencia} pts` }
    : null;
  const secundarias = [
    resumen.mayorDiferencia && { label: "Mayor diferencia", valor: resumen.mayorDiferencia.texto, dif: `+${resumen.mayorDiferencia.diferencia}` },
    resumen.topAnotadorJornada && { label: "Figura de la fecha", valor: resumen.topAnotadorJornada.texto, dif: `${resumen.topAnotadorJornada.puntos} pts` },
  ].filter((b): b is { label: string; valor: string; dif: string } => Boolean(b));

  if (!principal && secundarias.length === 0) return null;

  return (
    <section className="reveal-on-scroll">
      <SectionTitle>Historias de la fecha</SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {principal && (
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-surface p-7 lg:col-span-2">
            <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-accent-orange">
              {principal.label}
            </span>
            <div>
              <div className="font-head text-3xl uppercase leading-none tracking-tight text-foreground sm:text-4xl">
                {principal.valor}
              </div>
              <div className="mt-3 font-ui text-sm uppercase tracking-wide text-muted">{principal.dif}</div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {secundarias.map((s) => (
            <div key={s.label} className="flex flex-1 flex-col justify-center gap-1.5 rounded-2xl border border-border bg-surface p-6">
              <span className="font-ui text-[11px] font-semibold uppercase tracking-wider text-muted">{s.label}</span>
              <span className="font-ui text-base font-semibold uppercase tracking-wide text-foreground">{s.valor}</span>
              <span className="font-mono text-sm font-bold tabular-nums text-accent-orange">{s.dif}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Página
--------------------------------------------------------------------------- */

export default async function Home() {
  const [heroData, partidosEnVivo, ultimosResultados, standings, topScorers, equipos, mvps, resumen] =
    await Promise.all([
      getHeroData(),
      getPartidosEnVivo(),
      getUltimosResultados(6),
      getStandings(),
      getTopScorers(5),
      getEquipos(),
      getMvpsRecientes(1),
      getResumenEditorial(),
    ]);

  const hayEnVivo = partidosEnVivo.length > 0;

  // Estado real de la liga (nada inventado).
  const totalJugadores = equipos.reduce((acc, e) => acc + e.jugadores, 0);
  const partidosJugados = Math.round(standings.reduce((acc, r) => acc + r.pj, 0) / 2);
  const lider = standings[0] && standings[0].pj > 0 ? standings[0] : null;
  const maxAnotador = topScorers[0] ? { nombre: topScorers[0].nombre, puntos: topScorers[0].puntosTotal } : null;
  const mvpReciente = mvps[0] ?? null;
  const ultimoResultado = ultimosResultados[0] ? marcadorTexto(ultimosResultados[0]) : null;

  const countdownTarget =
    heroData.tipo === "PROXIMA_JORNADA"
      ? heroData.jornada.partidos
          .map((p) => p.fechaHora)
          .filter((f): f is Date => f !== null)
          .map((f) => new Date(f).getTime())
          .sort((a, b) => a - b)[0] ?? null
      : null;

  const jornadaLabel =
    heroData.tipo === "PROXIMA_JORNADA" || heroData.tipo === "ULTIMOS_RESULTADOS"
      ? `Jornada ${heroData.jornada.numero}`
      : hayEnVivo
        ? "En juego"
        : "Liga San Clemente";

  const proximaFecha =
    heroData.tipo === "PROXIMA_JORNADA"
      ? `Jornada ${heroData.jornada.numero}${heroData.jornada.fecha ? ` · ${formatFechaCortaCL(heroData.jornada.fecha)}` : ""}`
      : null;

  // Dato lateral: figura de la fecha si existe (real desde resumen).
  const datoFecha = resumen?.topAnotadorJornada
    ? { label: "Figura de la fecha", valor: `${resumen.topAnotadorJornada.texto} · ${resumen.topAnotadorJornada.puntos} pts` }
    : resumen?.mayorDiferencia
      ? { label: "Mayor diferencia", valor: resumen.mayorDiferencia.texto }
      : null;

  // Directorio de clubes ordenado por posición real (los que jugaron primero).
  const posPorClub = new Map<string, StandingRow>();
  standings.forEach((r) => posPorClub.set(r.clubId, r));
  const clubesDir = [...equipos]
    .map((e) => {
      const s = posPorClub.get(e.id);
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

  return (
    <div className="landing-shell flex flex-1 flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-border bg-[rgba(5,7,10,0.72)] backdrop-blur-md">
        <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="font-head text-xl uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#top", label: "Inicio" },
              { href: "#top", label: "Fixture" },
              { href: "#tabla", label: "Tabla" },
              { href: "#lideres", label: "Líderes" },
              { href: "#clubes", label: "Clubes" },
            ].map((l, i) => (
              <a
                key={`${l.label}-${i}`}
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

      <main className="flex flex-1 flex-col">
        <HeroSection hero={heroData} countdownTarget={countdownTarget} jornadaLabel={jornadaLabel} />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-14 sm:px-6 sm:py-16">
          <EstadoLiga
            lider={lider}
            maxAnotador={maxAnotador}
            proximaFecha={proximaFecha}
            partidosJugados={partidosJugados}
            equipos={equipos.length}
            jugadores={totalJugadores}
            ultimoResultado={ultimoResultado}
          />

          <section className="reveal-on-scroll">
            <SectionTitle id="tabla">Posiciones</SectionTitle>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <StandingsTable rows={standings} />
              </div>
              <div className="lg:col-span-2">
                <LideresRail topScorers={topScorers} mvp={mvpReciente} dato={datoFecha} />
              </div>
            </div>
          </section>

          {ultimosResultados.length > 0 && (
            <section className="reveal-on-scroll">
              <SectionTitle id="resultados">Últimos resultados</SectionTitle>
              <ResultadosList partidos={ultimosResultados} />
            </section>
          )}

          <section className="reveal-on-scroll">
            <SectionTitle id="clubes">Clubes</SectionTitle>
            <ClubesDirectorio clubes={clubesDir} />
          </section>

          <HistoriasFecha resumen={resumen} />
        </div>

        <section className="border-t border-border bg-bg-soft">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <h2 className="font-head text-3xl uppercase leading-tight tracking-tight text-foreground sm:text-4xl">
              Liga de Básquetbol San Clemente
            </h2>
            <p className="mt-3 font-ui text-sm font-medium uppercase tracking-wide text-accent-orange">Temporada 2026</p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
              Resultados, fixture y estadísticas oficiales de la competencia, directo desde el acta
              de cada partido.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 sm:px-6">
          <span className="font-head text-lg uppercase tracking-wide text-foreground">
            LBSC<span className="text-accent-orange">·</span>2026
          </span>
          <span className="font-ui text-[11px] uppercase tracking-wide text-muted/70">
            Temporada 2026 · Resultados oficiales desde acta
          </span>
        </div>
      </footer>
    </div>
  );
}
