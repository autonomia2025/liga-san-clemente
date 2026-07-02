import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { formatFechaCL, formatFechaHoraCL } from "@/lib/fecha";
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

function abrev(nombre: string): string {
  return nombre.slice(0, 3).toUpperCase();
}

function ClubMark({ nombre, size = "md" }: { nombre: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14 text-base" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-sm";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-surface-hover font-bold text-foreground ring-1 ring-border`}
    >
      {abrev(nombre)}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  id,
}: {
  eyebrow: string;
  title: string;
  id?: string;
}) {
  return (
    <div id={id} className="flex scroll-mt-20 flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-accent-orange">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex animate-fade-in items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 p-8">
      <p className="max-w-sm text-center text-sm text-muted">{mensaje}</p>
    </div>
  );
}

function PartidoCard({ partido }: { partido: PartidoResumen }) {
  const finalizado = partido.estado === "FINALIZADO" && partido.resultadoLocal !== null;
  const enVivo = partido.estado === "EN_CURSO";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-orange/40">
      <div className="flex items-center justify-between">
        <Badge tone={enVivo ? "accent-orange" : finalizado ? "success" : "neutral"} live={enVivo}>
          {enVivo ? "En vivo" : finalizado ? "Finalizado" : "Programado"}
        </Badge>
        <span className="text-xs text-muted">
          {partido.fechaHora ? formatFechaHoraCL(partido.fechaHora) : "Sin horario definido"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ClubMark nombre={partido.clubLocal.nombre} size="sm" />
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {partido.clubLocal.nombre}
          </span>
        </div>
        <span className="shrink-0 px-2 text-lg font-bold tabular-nums text-foreground">
          {finalizado || enVivo ? (partido.resultadoLocal ?? "-") : ""}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ClubMark nombre={partido.clubVisitante.nombre} size="sm" />
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {partido.clubVisitante.nombre}
          </span>
        </div>
        <span className="shrink-0 px-2 text-lg font-bold tabular-nums text-foreground">
          {finalizado || enVivo ? (partido.resultadoVisitante ?? "-") : ""}
        </span>
      </div>

      {finalizado && partido.mvpNombre && (
        <span className="text-xs text-muted">MVP: {partido.mvpNombre}</span>
      )}
    </div>
  );
}

function HeroSection({
  hero,
}: {
  hero: Awaited<ReturnType<typeof getHeroData>>;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 sm:p-10">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent-orange/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent-blue/20 blur-3xl" />

      <div className="relative flex animate-hero-in flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Badge tone="accent-orange">LBSC 2026</Badge>
          <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Vive la Liga San Clemente 2026 en tiempo real.
          </h1>
          <p className="max-w-xl text-sm text-muted sm:text-base">
            Resultados, fixture, rankings y figuras de la casa del básquet san clementino.
          </p>
        </div>

        {hero.tipo === "EN_VIVO" && (
          <div className="flex flex-col gap-4 rounded-xl border border-accent-orange/30 bg-background/60 p-5">
            <Badge tone="accent-orange" live>
              En vivo{hero.liveState.cuartoActivo ? ` · Q${hero.liveState.cuartoActivo}` : ""}
            </Badge>
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-end">
                <ClubMark nombre={hero.partido.clubLocal.nombre} size="lg" />
                <span className="truncate text-sm font-medium text-foreground sm:text-base">
                  {hero.partido.clubLocal.nombre}
                </span>
              </div>
              <span className="shrink-0 text-4xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-6xl">
                {hero.liveState.marcadorLocal}
                <span className="px-2 text-muted">-</span>
                {hero.liveState.marcadorVisitante}
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row">
                <span className="truncate text-sm font-medium text-foreground sm:text-base">
                  {hero.partido.clubVisitante.nombre}
                </span>
                <ClubMark nombre={hero.partido.clubVisitante.nombre} size="lg" />
              </div>
            </div>
          </div>
        )}

        {hero.tipo === "PROXIMA_JORNADA" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Jornada {hero.jornada.numero}
              </span>
              <span className="text-xs text-muted">
                {hero.jornada.fecha ? formatFechaCL(hero.jornada.fecha) : "Fecha por confirmar"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {hero.jornada.partidos.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {p.clubLocal.nombre} vs {p.clubVisitante.nombre}
                  </span>
                  <span className="text-xs text-muted">
                    {p.fechaHora ? formatFechaHoraCL(p.fechaHora) : "Por confirmar"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hero.tipo === "ULTIMOS_RESULTADOS" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-5">
            <span className="text-sm font-semibold text-foreground">
              Jornada {hero.jornada.numero} — últimos resultados
            </span>
            <div className="flex flex-col gap-2">
              {hero.jornada.partidos.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {p.clubLocal.nombre} {p.resultadoLocal} - {p.resultadoVisitante}{" "}
                    {p.clubVisitante.nombre}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hero.tipo === "VACIO" && (
          <div className="rounded-xl border border-dashed border-border bg-background/60 p-5">
            <p className="text-sm text-muted">
              La temporada 2026 todavía no tiene partidos cargados. Muy pronto vas a poder seguir
              cada fecha acá.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href="#fixture"
            className="rounded-full bg-accent-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-95"
          >
            Ver fixture
          </a>
          <a
            href="#tabla"
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent-blue/40 hover:text-foreground active:scale-95"
          >
            Ver rankings
          </a>
          <a
            href="#equipos"
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent-blue/40 hover:text-foreground active:scale-95"
          >
            Ver equipos
          </a>
          <a
            href="#resultados"
            className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent-blue/40 hover:text-foreground active:scale-95"
          >
            Últimos resultados
          </a>
        </div>
      </div>
    </section>
  );
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.every((r) => r.pj === 0)) {
    return <EstadoVacio mensaje="La tabla de posiciones se arma a medida que se juegan y cierran partidos." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Equipo</th>
            <th className="px-3 py-2 text-center font-semibold">PJ</th>
            <th className="px-3 py-2 text-center font-semibold">PG</th>
            <th className="px-3 py-2 text-center font-semibold">PP</th>
            <th className="px-3 py-2 text-center font-semibold">PF</th>
            <th className="px-3 py-2 text-center font-semibold">PC</th>
            <th className="px-3 py-2 text-center font-semibold">DIF</th>
            <th className="px-3 py-2 text-center font-semibold text-accent-orange">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.clubId}
              className={`border-b border-border/50 last:border-0 ${i % 2 === 1 ? "bg-surface-hover/40" : ""}`}
            >
              <td className="px-3 py-2 text-muted">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <ClubMark nombre={r.clubNombre} size="sm" />
                  <span className="whitespace-nowrap font-medium text-foreground">{r.clubNombre}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">{r.pj}</td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">{r.pg}</td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">{r.pp}</td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">{r.pf}</td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">{r.pc}</td>
              <td className="px-3 py-2 text-center tabular-nums text-foreground">
                {r.dif > 0 ? `+${r.dif}` : r.dif}
              </td>
              <td className="px-3 py-2 text-center text-base font-bold tabular-nums text-accent-orange">
                {r.pts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopScorersList({ rows }: { rows: TopScorerRow[] }) {
  if (rows.length === 0) {
    return <EstadoVacio mensaje="Los goleadores de la temporada se irán mostrando a medida que se registren puntos." />;
  }
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {rows.map((r, i) => (
        <div
          key={r.jugadorId}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
        >
          <span className="w-5 shrink-0 text-center text-sm font-bold text-muted">{i + 1}</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-foreground ring-1 ring-border">
            {r.numeroCamiseta !== null ? `#${r.numeroCamiseta}` : "—"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{r.nombre}</span>
            <span className="truncate text-xs text-muted">{r.clubNombre}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-lg font-bold tabular-nums text-accent-blue">{r.puntosTotal}</span>
            <span className="text-[10px] text-muted">
              {r.partidosJugados} PJ · {r.promedio} PPP
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MvpsGrid({ mvps }: { mvps: Awaited<ReturnType<typeof getMvpsRecientes>> }) {
  if (mvps.length === 0) {
    return (
      <EstadoVacio mensaje="Los MVPs se irán destacando a medida que avance la temporada." />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {mvps.map((m, i) => (
        <div
          key={`${m.jugadorNombre}-${i}`}
          className="flex flex-col gap-2 rounded-xl border border-accent-orange/20 bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5"
        >
          <Badge tone="accent-orange">MVP · Jornada {m.jornadaNumero}</Badge>
          <span className="text-base font-semibold text-foreground">{m.jugadorNombre}</span>
          <span className="text-xs text-muted">{m.clubNombre}</span>
          <span className="text-xs text-muted">{m.resultado}</span>
        </div>
      ))}
    </div>
  );
}

function EquiposGrid({ equipos }: { equipos: Awaited<ReturnType<typeof getEquipos>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {equipos.map((e) => (
        <div
          key={e.id}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-blue/40"
        >
          <ClubMark nombre={e.nombre} size="lg" />
          <span className="line-clamp-2 text-sm font-medium text-foreground">{e.nombre}</span>
          <span className="text-xs text-muted">{e.jugadores} jugadores</span>
        </div>
      ))}
    </div>
  );
}

function FixturePreview({ jornadas }: { jornadas: Awaited<ReturnType<typeof getProximasJornadas>> }) {
  if (jornadas.length === 0) {
    return <EstadoVacio mensaje="El fixture se actualizará acá apenas se confirmen las próximas fechas." />;
  }
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {jornadas.map((j) => (
        <div key={j.numero} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-sm font-bold text-accent-blue">
              {j.numero}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Jornada {j.numero}</span>
              <span className="text-xs text-muted">
                {j.fecha ? formatFechaCL(j.fecha) : "Fecha por confirmar"}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted">
            {j.finalizados}/{j.totalPartidos} jugados
          </span>
        </div>
      ))}
    </div>
  );
}

function ResumenEditorialSection({
  resumen,
}: {
  resumen: Awaited<ReturnType<typeof getResumenEditorial>>;
}) {
  if (!resumen) {
    return (
      <EstadoVacio mensaje="El resumen editorial de la jornada aparecerá acá apenas se jueguen los primeros partidos." />
    );
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {bloques.map((b) => (
        <div key={b.label} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{b.label}</span>
          <span className="text-sm font-semibold text-foreground">{b.valor}</span>
          <span className="text-xs text-accent-orange">{b.detalle}</span>
        </div>
      ))}
    </div>
  );
}

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

  const partidosDestacados: PartidoResumen[] =
    partidosEnVivo.length > 0
      ? partidosEnVivo
      : heroData.tipo === "PROXIMA_JORNADA"
        ? heroData.jornada.partidos
        : [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-orange text-sm font-bold text-white">
            SC
          </span>
          <span className="text-sm font-semibold tracking-wide">LBSC 2026</span>
        </div>
        <nav className="hidden items-center gap-5 text-sm text-muted sm:flex">
          <a href="#fixture" className="transition-colors hover:text-foreground">
            Fixture
          </a>
          <a href="#tabla" className="transition-colors hover:text-foreground">
            Posiciones
          </a>
          <a href="#goleadores" className="transition-colors hover:text-foreground">
            Goleadores
          </a>
          <a href="#equipos" className="transition-colors hover:text-foreground">
            Equipos
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
        <HeroSection hero={heroData} />

        <section className="flex flex-col gap-4">
          <SectionHeading
            eyebrow={partidosEnVivo.length > 0 ? "Ahora" : "Próxima fecha"}
            title={partidosEnVivo.length > 0 ? "Partidos en vivo" : "Próximos partidos"}
            id="partidos"
          />
          {partidosDestacados.length === 0 ? (
            <EstadoVacio mensaje="No hay partidos programados por ahora. Volvé pronto para ver la próxima fecha." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {partidosDestacados.map((p) => (
                <PartidoCard key={p.id} partido={p} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Ranking" title="Tabla de posiciones" id="tabla" />
          <StandingsTable rows={standings} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Figuras" title="Top anotadores" id="goleadores" />
          <TopScorersList rows={topScorers} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Resultados" title="Últimos resultados" id="resultados" />
          {ultimosResultados.length === 0 ? (
            <EstadoVacio mensaje="Todavía no hay partidos finalizados en la temporada 2026." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ultimosResultados.map((p) => (
                <PartidoCard key={p.id} partido={p} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Destacados" title="MVPs de la temporada" id="mvps" />
          <MvpsGrid mvps={mvps} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="La liga" title="Equipos participantes" id="equipos" />
          <EquiposGrid equipos={equipos} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Calendario" title="Fixture" id="fixture" />
          <FixturePreview jornadas={proximasJornadas} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading eyebrow="Editorial" title="Resumen de la jornada" />
          <ResumenEditorialSection resumen={resumen} />
        </section>

        <section className="animate-fade-in rounded-2xl border border-border bg-surface/40 p-6 text-center sm:p-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-blue">
            Comunidad
          </span>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            La Liga de Básquetbol San Clemente reúne a clubes, jugadores y familias en una
            temporada que ahora también se vive con resultados, estadísticas y seguimiento en
            tiempo real.
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-6">
        Liga de Básquetbol San Clemente — LBSC 2026
      </footer>
    </div>
  );
}
