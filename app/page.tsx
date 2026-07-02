import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { formatFechaCortaCL, formatFechaHoraCortaCL, formatHoraCortaCL } from "@/lib/fecha";
import { clubAbrev, clubAcento, clubNombreCorto } from "@/lib/public/display";
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
   Piezas visuales compartidas
--------------------------------------------------------------------------- */

const DIMS_AVATAR = {
  sm: "h-9 w-9 text-[10px] rounded-xl",
  md: "h-11 w-11 text-xs rounded-xl",
  lg: "h-16 w-16 text-sm rounded-2xl",
  xl: "h-20 w-20 text-base rounded-2xl",
} as const;

function ClubMark({ nombre, size = "md" }: { nombre: string; size?: keyof typeof DIMS_AVATAR }) {
  return (
    <span
      className={`flex ${DIMS_AVATAR[size]} shrink-0 items-center justify-center bg-gradient-to-br font-extrabold tracking-wide text-white ring-1 ring-white/10 ${clubAcento(nombre)}`}
    >
      {clubAbrev(nombre)}
    </span>
  );
}

// Título de sección sin "eyebrow" en mayúsculas (evita el tell de AI de poner
// un micro-label idéntico sobre cada sección). Solo una barra de acento no
// textual + headline fuerte, con un hint opcional de una línea.
function SectionTitle({ title, hint, id }: { title: string; hint?: string; id?: string }) {
  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-2">
      <span className="h-1 w-10 rounded-full bg-accent-orange" />
      <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {hint && <p className="max-w-xl text-sm text-muted">{hint}</p>}
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
   Match card (partido por jugarse) — foco en el enfrentamiento y el horario
--------------------------------------------------------------------------- */

function MatchCard({ partido }: { partido: PartidoResumen }) {
  return (
    <div className="group flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-accent-orange/40 hover:shadow-glow-orange">
      <div className="flex items-center justify-between">
        <Badge tone="accent-blue">Programado</Badge>
        {partido.fechaHora && (
          <span className="text-xs font-semibold text-muted">
            {formatFechaHoraCortaCL(partido.fechaHora)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <ClubMark nombre={partido.clubLocal.nombre} size="md" />
          <span className="min-w-0 truncate text-sm font-bold text-foreground">
            {clubNombreCorto(partido.clubLocal.nombre)}
          </span>
        </div>
        <span className="shrink-0 text-sm font-black text-accent-orange">VS</span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <ClubMark nombre={partido.clubVisitante.nombre} size="md" />
          <span className="min-w-0 truncate text-sm font-bold text-foreground">
            {clubNombreCorto(partido.clubVisitante.nombre)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Score card (resultado final) — foco en el marcador y el ganador
--------------------------------------------------------------------------- */

function ScoreCard({ partido }: { partido: PartidoResumen }) {
  const enVivo = partido.estado === "EN_CURSO";
  const localGana = esGanador(partido.resultadoLocal, partido.resultadoVisitante);
  const visitanteGana = esGanador(partido.resultadoVisitante, partido.resultadoLocal);

  return (
    <div
      className={`group flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-glow-orange ${
        enVivo ? "border-success/40" : "border-border hover:border-accent-orange/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <Badge tone={enVivo ? "success" : "neutral"} live={enVivo}>
          {enVivo ? "En vivo" : "Finalizado"}
        </Badge>
        {partido.fechaHora && (
          <span className="text-xs font-medium text-muted">
            {formatFechaHoraCortaCL(partido.fechaHora)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ClubMark nombre={partido.clubLocal.nombre} size="sm" />
            <span className={`min-w-0 truncate text-sm ${localGana ? "font-bold text-foreground" : "font-medium text-muted"}`}>
              {clubNombreCorto(partido.clubLocal.nombre)}
            </span>
          </div>
          <span className={`shrink-0 text-2xl font-black tabular-nums ${localGana ? "text-accent-orange" : "text-foreground"}`}>
            {partido.resultadoLocal ?? "-"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ClubMark nombre={partido.clubVisitante.nombre} size="sm" />
            <span className={`min-w-0 truncate text-sm ${visitanteGana ? "font-bold text-foreground" : "font-medium text-muted"}`}>
              {clubNombreCorto(partido.clubVisitante.nombre)}
            </span>
          </div>
          <span className={`shrink-0 text-2xl font-black tabular-nums ${visitanteGana ? "text-accent-orange" : "text-foreground"}`}>
            {partido.resultadoVisitante ?? "-"}
          </span>
        </div>
      </div>

      {partido.mvpNombre && (
        <span className="border-t border-border pt-3 text-xs text-muted">
          MVP <span className="font-semibold text-foreground">{partido.mvpNombre}</span>
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Hero
--------------------------------------------------------------------------- */

function HeroScoreboard({ hero }: { hero: Awaited<ReturnType<typeof getHeroData>> }) {
  // Contenedor "double-bezel": shell exterior + núcleo interior, para que el
  // marcador se sienta como una pieza física (estilo hardware premium).
  const shell = "rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-1.5";
  const core = "rounded-[calc(1.75rem-0.375rem)] bg-background/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8";

  if (hero.tipo === "EN_VIVO") {
    return (
      <div className={shell}>
        <div className={`flex flex-col gap-6 ${core}`}>
          <div className="flex items-center justify-between">
            <Badge tone="success" live>
              En vivo{hero.liveState.cuartoActivo ? ` · Q${hero.liveState.cuartoActivo}` : ""}
            </Badge>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Partido en curso</span>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-12">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <ClubMark nombre={hero.partido.clubLocal.nombre} size="xl" />
              <span className="truncate text-sm font-bold text-foreground sm:text-base">
                {clubNombreCorto(hero.partido.clubLocal.nombre)}
              </span>
            </div>
            <span className="shrink-0 bg-gradient-to-br from-foreground to-muted bg-clip-text text-5xl font-black tracking-tight tabular-nums text-transparent sm:text-7xl">
              {hero.liveState.marcadorLocal}
              <span className="px-2 text-border sm:px-3">:</span>
              {hero.liveState.marcadorVisitante}
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <ClubMark nombre={hero.partido.clubVisitante.nombre} size="xl" />
              <span className="truncate text-sm font-bold text-foreground sm:text-base">
                {clubNombreCorto(hero.partido.clubVisitante.nombre)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hero.tipo === "PROXIMA_JORNADA") {
    const [destacado, ...resto] = hero.jornada.partidos;
    return (
      <div className={shell}>
        <div className={`flex flex-col gap-5 ${core}`}>
          <div className="flex items-center justify-between">
            <Badge tone="accent-orange">Jornada {hero.jornada.numero}</Badge>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              {hero.jornada.fecha ? formatFechaCortaCL(hero.jornada.fecha) : "Fecha por confirmar"}
            </span>
          </div>

          {destacado && (
            <div className="flex items-center justify-center gap-4 sm:gap-10">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <ClubMark nombre={destacado.clubLocal.nombre} size="lg" />
                <span className="truncate text-sm font-bold text-foreground sm:text-base">
                  {clubNombreCorto(destacado.clubLocal.nombre)}
                </span>
              </div>
              <span className="shrink-0 text-2xl font-black text-accent-orange sm:text-3xl">VS</span>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <ClubMark nombre={destacado.clubVisitante.nombre} size="lg" />
                <span className="truncate text-sm font-bold text-foreground sm:text-base">
                  {clubNombreCorto(destacado.clubVisitante.nombre)}
                </span>
              </div>
            </div>
          )}
          {destacado?.fechaHora && (
            <span className="-mt-1 text-center text-xs font-semibold text-muted">
              {formatFechaHoraCortaCL(destacado.fechaHora)}
            </span>
          )}

          {resto.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {resto.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">
                    {clubNombreCorto(p.clubLocal.nombre)} vs {clubNombreCorto(p.clubVisitante.nombre)}
                  </span>
                  <span className="shrink-0 pl-3 text-xs text-muted">
                    {p.fechaHora ? formatHoraCortaCL(p.fechaHora) : "Por confirmar"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (hero.tipo === "ULTIMOS_RESULTADOS") {
    return (
      <div className={shell}>
        <div className={`flex flex-col gap-4 ${core}`}>
          <div className="flex items-center justify-between">
            <Badge tone="neutral">Jornada {hero.jornada.numero}</Badge>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Resultados</span>
          </div>
          <div className="flex flex-col gap-3">
            {hero.jornada.partidos.slice(0, 3).map((p) => {
              const localGana = esGanador(p.resultadoLocal, p.resultadoVisitante);
              const visitanteGana = esGanador(p.resultadoVisitante, p.resultadoLocal);
              return (
                <div key={p.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm sm:text-base">
                  <span className={`truncate text-right ${localGana ? "font-bold text-foreground" : "text-muted"}`}>
                    {clubNombreCorto(p.clubLocal.nombre)}
                  </span>
                  <span className="px-2 font-black tabular-nums text-accent-orange">
                    {p.resultadoLocal} : {p.resultadoVisitante}
                  </span>
                  <span className={`truncate ${visitanteGana ? "font-bold text-foreground" : "text-muted"}`}>
                    {clubNombreCorto(p.clubVisitante.nombre)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className={core}>
        <p className="text-sm text-muted">
          La temporada 2026 todavía no tiene partidos cargados. Muy pronto vas a poder seguir cada
          fecha acá.
        </p>
      </div>
    </div>
  );
}

function HeroSection({
  hero,
  temporadaLabel,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
  temporadaLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface via-surface to-background p-6 sm:p-10 lg:p-14">
      <div className="pointer-events-none absolute inset-0 bg-hero-texture opacity-60" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-accent-orange/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-[26rem] w-[26rem] rounded-full bg-accent-blue/25 blur-[100px]" />

      <div className="relative grid animate-hero-in items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-6">
          <Badge tone="accent-orange">LBSC 2026 · {temporadaLabel}</Badge>
          <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Vive la Liga San Clemente{" "}
            <span className="bg-gradient-to-r from-accent-orange to-amber-400 bg-clip-text text-transparent">
              en tiempo real.
            </span>
          </h1>
          <p className="max-w-md text-base text-muted sm:text-lg">
            Resultados, fixture, rankings y figuras de la casa del básquet san clementino.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#fixture"
              className="rounded-full bg-accent-orange px-6 py-3 text-sm font-bold text-white shadow-glow-orange transition-transform duration-200 hover:opacity-90 active:scale-95"
            >
              Ver fixture
            </a>
            <a
              href="#tabla"
              className="rounded-full border border-border bg-background/40 px-5 py-3 text-sm font-semibold text-muted transition-colors hover:border-accent-blue/50 hover:text-foreground active:scale-95"
            >
              Tabla
            </a>
            <a
              href="#goleadores"
              className="rounded-full border border-border bg-background/40 px-5 py-3 text-sm font-semibold text-muted transition-colors hover:border-accent-blue/50 hover:text-foreground active:scale-95"
            >
              Goleadores
            </a>
            <a
              href="#equipos"
              className="rounded-full border border-border bg-background/40 px-5 py-3 text-sm font-semibold text-muted transition-colors hover:border-accent-blue/50 hover:text-foreground active:scale-95"
            >
              Equipos
            </a>
          </div>
        </div>

        <HeroScoreboard hero={hero} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Stat band (estado real de la liga)
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
    { label: "Equipos", valor: String(equipos), detalle: "en competencia" },
    { label: "Jugadores", valor: String(jugadores), detalle: "inscritos" },
    { label: "Partidos jugados", valor: String(partidosJugados), detalle: "en la temporada" },
    maxAnotador
      ? { label: "Máximo anotador", valor: String(maxAnotador.puntos), detalle: maxAnotador.nombre }
      : { label: "Máximo anotador", valor: "-", detalle: "aún sin datos" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</span>
          <span className="text-3xl font-black tabular-nums text-foreground">{s.valor}</span>
          <span className="truncate text-xs text-muted">{s.detalle}</span>
        </div>
      ))}
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
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-3 font-semibold">#</th>
            <th className="px-3 py-3 font-semibold">Equipo</th>
            <th className="px-3 py-3 text-center font-semibold">PJ</th>
            <th className="px-3 py-3 text-center font-semibold">PG</th>
            <th className="px-3 py-3 text-center font-semibold">PP</th>
            <th className="px-3 py-3 text-center font-semibold">PF</th>
            <th className="px-3 py-3 text-center font-semibold">PC</th>
            <th className="px-3 py-3 text-center font-semibold">DIF</th>
            <th className="px-3 py-3 text-center font-semibold text-accent-orange">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const top3 = i < 3;
            return (
              <tr
                key={r.clubId}
                className={`border-b border-border/50 transition-colors last:border-0 hover:bg-surface-hover/60 ${
                  i === 0 ? "bg-accent-orange/[0.06]" : i % 2 === 1 ? "bg-surface-hover/30" : ""
                }`}
              >
                <td className="px-3 py-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      top3 ? "bg-accent-orange/20 text-accent-orange" : "text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <ClubMark nombre={r.clubNombre} size="sm" />
                    <span className={`whitespace-nowrap ${i === 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                      {clubNombreCorto(r.clubNombre)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground">{r.pj}</td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground">{r.pg}</td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground">{r.pp}</td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground">{r.pf}</td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground">{r.pc}</td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums text-foreground">
                  {r.dif > 0 ? `+${r.dif}` : r.dif}
                </td>
                <td className="px-3 py-3 text-center text-base font-black tabular-nums text-accent-orange">
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Leaderboard de anotadores
--------------------------------------------------------------------------- */

function TopScorersList({ rows }: { rows: TopScorerRow[] }) {
  if (rows.length === 0) {
    return <EstadoVacio mensaje="Los goleadores de la temporada se irán mostrando a medida que se registren puntos." />;
  }
  const [lider, ...resto] = rows;

  return (
    <div className="flex flex-col gap-3">
      {lider && (
        <div className="flex items-center gap-4 rounded-2xl border border-accent-orange/30 bg-gradient-to-br from-accent-orange/10 to-transparent p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-orange text-sm font-black text-white">
            1
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-base font-bold text-foreground">{lider.nombre}</span>
            <div className="flex items-center gap-2">
              <Badge tone="accent-blue">{clubNombreCorto(lider.clubNombre)}</Badge>
              {lider.numeroCamiseta !== null && <span className="text-xs text-muted">#{lider.numeroCamiseta}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-3xl font-black tabular-nums text-accent-orange">{lider.puntosTotal}</span>
            <span className="text-[11px] text-muted">{lider.partidosJugados} PJ · {lider.promedio} PPP</span>
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {resto.map((r, i) => (
          <div key={r.jugadorId} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
            <span className={`w-6 shrink-0 text-center text-sm font-bold ${i < 2 ? "text-accent-orange" : "text-muted"}`}>
              {i + 2}
            </span>
            <ClubMark nombre={r.clubNombre} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">{r.nombre}</span>
              <span className="truncate text-xs text-muted">
                {clubNombreCorto(r.clubNombre)} {r.numeroCamiseta !== null ? `· #${r.numeroCamiseta}` : ""}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-lg font-bold tabular-nums text-foreground">{r.puntosTotal}</span>
              <span className="text-[10px] text-muted">{r.promedio} PPP</span>
            </div>
          </div>
        ))}
      </div>
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mvps.map((m, i) => (
        <div
          key={`${m.jugadorNombre}-${i}`}
          className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-accent-orange/25 bg-surface p-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-glow-orange"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-orange to-amber-400" />
          <Badge tone="accent-orange">MVP · Jornada {m.jornadaNumero}</Badge>
          <span className="text-lg font-bold text-foreground">{m.jugadorNombre}</span>
          <span className="text-xs font-semibold text-muted">{clubNombreCorto(m.clubNombre)}</span>
          <span className="text-xs text-muted">{m.resultado}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Equipos
--------------------------------------------------------------------------- */

function EquiposGrid({ equipos }: { equipos: Awaited<ReturnType<typeof getEquipos>> }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {equipos.map((e) => (
        <div
          key={e.id}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-accent-blue/40 hover:shadow-glow-blue"
        >
          <ClubMark nombre={e.nombre} size="lg" />
          <span className="line-clamp-2 text-sm font-bold text-foreground">{clubNombreCorto(e.nombre)}</span>
          <span className="text-xs text-muted">{e.jugadores} jugadores</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Fixture (lista con progreso por jornada)
--------------------------------------------------------------------------- */

function FixturePreview({ jornadas }: { jornadas: Awaited<ReturnType<typeof getProximasJornadas>> }) {
  if (jornadas.length === 0) {
    return <EstadoVacio mensaje="El fixture se actualizará acá apenas se confirmen las próximas fechas." />;
  }
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {jornadas.map((j) => {
        const progreso = j.totalPartidos > 0 ? Math.round((j.finalizados / j.totalPartidos) * 100) : 0;
        return (
          <div key={j.numero} className="flex items-center gap-4 px-5 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-blue/15 text-base font-black text-accent-blue">
              {j.numero}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Jornada {j.numero}</span>
                <span className="text-xs text-muted">
                  {j.fecha ? formatFechaCortaCL(j.fecha) : "Fecha por confirmar"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent-orange transition-all" style={{ width: `${progreso}%` }} />
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted">
              {j.finalizados}/{j.totalPartidos}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Resumen editorial
--------------------------------------------------------------------------- */

function ResumenEditorialSection({
  resumen,
}: {
  resumen: Awaited<ReturnType<typeof getResumenEditorial>>;
}) {
  if (!resumen) {
    return <EstadoVacio mensaje="El resumen editorial de la jornada aparecerá acá apenas se jueguen los primeros partidos." />;
  }
  const bloques = [
    resumen.partidoMasCerrado && {
      label: "Partido más cerrado",
      valor: resumen.partidoMasCerrado.texto,
      detalle: `Diferencia de ${resumen.partidoMasCerrado.diferencia} pts`,
    },
    resumen.mayorDiferencia && {
      label: "Mayor diferencia",
      valor: resumen.mayorDiferencia.texto,
      detalle: `Diferencia de ${resumen.mayorDiferencia.diferencia} pts`,
    },
    resumen.topAnotadorJornada && {
      label: "Figura de la jornada",
      valor: resumen.topAnotadorJornada.texto,
      detalle: `${resumen.topAnotadorJornada.puntos} pts en el partido`,
    },
  ].filter((b): b is { label: string; valor: string; detalle: string } => Boolean(b));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {bloques.map((b) => (
        <div
          key={b.label}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-accent-orange/30"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-accent-orange">{b.label}</span>
          <span className="text-lg font-bold leading-snug text-foreground">{b.valor}</span>
          <span className="text-xs font-semibold text-muted">{b.detalle}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Página
--------------------------------------------------------------------------- */

export default async function Home() {
  // getHeroData() ya resuelve internamente si hay próxima jornada (llama a
  // getProximaJornada() cuando corresponde) — no se vuelve a pedir acá para
  // no duplicar esa misma query por cada carga de la landing.
  const [heroData, partidosEnVivo, ultimosResultados, standings, topScorers, equipos, mvps, resumen, proximasJornadas] =
    await Promise.all([
      getHeroData(),
      getPartidosEnVivo(),
      getUltimosResultados(6),
      getStandings(),
      getTopScorers(8),
      getEquipos(),
      getMvpsRecientes(6),
      getResumenEditorial(),
      getProximasJornadas(4),
    ]);

  const partidosProximos: PartidoResumen[] =
    heroData.tipo === "PROXIMA_JORNADA" ? heroData.jornada.partidos : [];

  // Estado real de la liga para el stat band (nada inventado).
  const totalJugadores = equipos.reduce((acc, e) => acc + e.jugadores, 0);
  const partidosJugados = Math.round(standings.reduce((acc, r) => acc + r.pj, 0) / 2);
  const maxAnotador = topScorers[0]
    ? { nombre: topScorers[0].nombre, puntos: topScorers[0].puntosTotal }
    : null;
  const temporadaLabel =
    heroData.tipo === "EN_VIVO"
      ? "En juego ahora"
      : heroData.tipo === "PROXIMA_JORNADA"
        ? `Jornada ${heroData.jornada.numero}`
        : "Temporada 2026";

  const hayEnVivo = partidosEnVivo.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-orange to-amber-500 text-sm font-black text-white shadow-glow-orange">
              SC
            </span>
            <span className="text-sm font-extrabold tracking-wide">LBSC 2026</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
            <a href="#fixture" className="transition-colors hover:text-foreground">Fixture</a>
            <a href="#tabla" className="transition-colors hover:text-foreground">Posiciones</a>
            <a href="#goleadores" className="transition-colors hover:text-foreground">Goleadores</a>
            <a href="#equipos" className="transition-colors hover:text-foreground">Equipos</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-4 py-8 sm:px-6 sm:py-14 lg:gap-24">
        <HeroSection hero={heroData} temporadaLabel={temporadaLabel} />

        <div className="reveal-on-scroll">
          <StatBand
            equipos={equipos.length}
            jugadores={totalJugadores}
            partidosJugados={partidosJugados}
            maxAnotador={maxAnotador}
          />
        </div>

        {(hayEnVivo || partidosProximos.length > 0) && (
          <section className="reveal-on-scroll flex flex-col gap-6">
            <SectionTitle
              title={hayEnVivo ? "Partidos en vivo" : "Próximos partidos"}
              hint={hayEnVivo ? "Seguí el marcador en tiempo real." : "La próxima fecha de la liga."}
              id="partidos"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hayEnVivo
                ? partidosEnVivo.map((p) => <ScoreCard key={p.id} partido={p} />)
                : partidosProximos.map((p) => <MatchCard key={p.id} partido={p} />)}
            </div>
          </section>
        )}

        <section className="reveal-on-scroll grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <SectionTitle title="Tabla de posiciones" hint="Victoria 2 pts, derrota 1 pt." id="tabla" />
            <StandingsTable rows={standings} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-2">
            <SectionTitle title="Top anotadores" id="goleadores" />
            <TopScorersList rows={topScorers} />
          </div>
        </section>

        <section className="reveal-on-scroll flex flex-col gap-6">
          <SectionTitle title="Últimos resultados" id="resultados" />
          {ultimosResultados.length === 0 ? (
            <EstadoVacio mensaje="Todavía no hay partidos finalizados en la temporada 2026." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ultimosResultados.map((p) => (
                <ScoreCard key={p.id} partido={p} />
              ))}
            </div>
          )}
        </section>

        <section className="reveal-on-scroll flex flex-col gap-6">
          <SectionTitle title="MVPs de la temporada" hint="Las figuras que eligió la mesa en cada partido." id="mvps" />
          <MvpsGrid mvps={mvps} />
        </section>

        <section className="reveal-on-scroll flex flex-col gap-6">
          <SectionTitle title="Equipos participantes" id="equipos" />
          <EquiposGrid equipos={equipos} />
        </section>

        <section className="reveal-on-scroll flex flex-col gap-6">
          <SectionTitle title="Fixture" hint="Cómo viene el calendario de la liga." id="fixture" />
          <FixturePreview jornadas={proximasJornadas} />
        </section>

        <section className="reveal-on-scroll flex flex-col gap-6">
          <SectionTitle title="Resumen de la jornada" />
          <ResumenEditorialSection resumen={resumen} />
        </section>

        <section className="reveal-on-scroll relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-background p-8 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-hero-texture opacity-40" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/15 blur-[100px]" />
          <div className="relative flex flex-col items-center gap-4">
            <p className="max-w-2xl text-3xl font-black tracking-tight text-foreground sm:text-5xl">
              La casa del básquet san clementino.
            </p>
            <p className="max-w-xl text-sm text-muted sm:text-base">
              Clubes, jugadores y familias de San Clemente, en una temporada que ahora también se
              vive con resultados, estadísticas y seguimiento en tiempo real.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-6">
        Liga de Básquetbol San Clemente · LBSC 2026
      </footer>
    </div>
  );
}
