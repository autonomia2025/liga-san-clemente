import { prisma } from "@/lib/db";
import { buildLiveMatchState, type LiveMatchState } from "@/lib/mesa/live-match-state";

type ClubResumen = { id: string; nombre: string; escudoUrl: string | null };

export type PartidoResumen = {
  id: string;
  fechaHora: Date | null;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  clubLocal: ClubResumen;
  clubVisitante: ClubResumen;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
  mvpNombre: string | null;
};

export type JornadaConPartidos = {
  numero: number;
  fecha: Date | null;
  partidos: PartidoResumen[];
};

export type HeroData =
  | { tipo: "EN_VIVO"; partido: PartidoResumen; liveState: LiveMatchState }
  | { tipo: "PROXIMA_JORNADA"; jornada: JornadaConPartidos }
  | { tipo: "ULTIMOS_RESULTADOS"; jornada: JornadaConPartidos }
  | { tipo: "VACIO" };

const PARTIDO_SELECT = {
  id: true,
  fechaHora: true,
  estado: true,
  clubLocal: { select: { id: true, nombre: true, escudoUrl: true } },
  clubVisitante: { select: { id: true, nombre: true, escudoUrl: true } },
  acta: { select: { resultadoLocal: true, resultadoVisitante: true, mvpJugador: { select: { nombre: true } } } },
} as const;

function toPartidoResumen(p: {
  id: string;
  fechaHora: Date | null;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  clubLocal: ClubResumen;
  clubVisitante: ClubResumen;
  acta: { resultadoLocal: number; resultadoVisitante: number; mvpJugador: { nombre: string } | null } | null;
}): PartidoResumen {
  return {
    id: p.id,
    fechaHora: p.fechaHora,
    estado: p.estado,
    clubLocal: p.clubLocal,
    clubVisitante: p.clubVisitante,
    resultadoLocal: p.acta?.resultadoLocal ?? null,
    resultadoVisitante: p.acta?.resultadoVisitante ?? null,
    mvpNombre: p.acta?.mvpJugador?.nombre ?? null,
  };
}

// La "próxima jornada" es la de menor número que todavía tiene algún
// partido sin finalizar — no se compara contra la fecha de hoy (evita
// bugs de timezone/reloj) y se muestran TODOS sus partidos, no solo los
// pendientes, para dar el panorama completo de esa fecha.
export async function getProximaJornada(): Promise<JornadaConPartidos | null> {
  const jornada = await prisma.jornada.findFirst({
    where: { partidos: { some: { estado: { in: ["PROGRAMADO", "CONFIRMADO"] } } } },
    orderBy: { numero: "asc" },
    select: {
      numero: true,
      fecha: true,
      partidos: {
        select: PARTIDO_SELECT,
        orderBy: { fechaHora: "asc" },
      },
    },
  });
  if (!jornada) return null;
  return { numero: jornada.numero, fecha: jornada.fecha, partidos: jornada.partidos.map(toPartidoResumen) };
}

export async function getPartidosEnVivo(): Promise<PartidoResumen[]> {
  const partidos = await prisma.partido.findMany({
    where: { estado: "EN_CURSO" },
    select: PARTIDO_SELECT,
    orderBy: { fechaHora: "asc" },
  });
  return partidos.map(toPartidoResumen);
}

export async function getUltimosResultados(limit = 5): Promise<PartidoResumen[]> {
  const partidos = await prisma.partido.findMany({
    where: { estado: "FINALIZADO", acta: { isNot: null } },
    select: PARTIDO_SELECT,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return partidos.map(toPartidoResumen);
}

// Última jornada con al menos un resultado — se usa tanto para el fallback
// del hero (temporada sin partidos pendientes) como para el resumen
// editorial (módulo 9).
async function getUltimaJornadaFinalizada(): Promise<JornadaConPartidos | null> {
  const jornada = await prisma.jornada.findFirst({
    where: { partidos: { some: { estado: "FINALIZADO", acta: { isNot: null } } } },
    orderBy: { numero: "desc" },
    select: {
      numero: true,
      fecha: true,
      partidos: {
        where: { estado: "FINALIZADO", acta: { isNot: null } },
        select: PARTIDO_SELECT,
        orderBy: { fechaHora: "asc" },
      },
    },
  });
  if (!jornada) return null;
  return { numero: jornada.numero, fecha: jornada.fecha, partidos: jornada.partidos.map(toPartidoResumen) };
}

// Decide qué protagoniza el hero: partido EN_CURSO > próxima jornada >
// últimos resultados > estado vacío. Nunca se inventa un partido
// destacado — si no hay datos reales para un nivel, se cae al siguiente.
export async function getHeroData(): Promise<HeroData> {
  const enVivo = await prisma.partido.findFirst({
    where: { estado: "EN_CURSO" },
    select: {
      ...PARTIDO_SELECT,
      clubLocalId: true,
      clubVisitanteId: true,
      eventos: {
        where: { anulado: false },
        orderBy: { createdAt: "asc" },
        select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
      },
    },
  });

  if (enVivo) {
    const liveState = buildLiveMatchState(enVivo.eventos, {
      clubLocalId: enVivo.clubLocalId,
      clubVisitanteId: enVivo.clubVisitanteId,
    });
    return { tipo: "EN_VIVO", partido: toPartidoResumen(enVivo), liveState };
  }

  const proxima = await getProximaJornada();
  if (proxima) return { tipo: "PROXIMA_JORNADA", jornada: proxima };

  const ultima = await getUltimaJornadaFinalizada();
  if (ultima) return { tipo: "ULTIMOS_RESULTADOS", jornada: ultima };

  return { tipo: "VACIO" };
}

export type EquipoResumen = { id: string; nombre: string; escudoUrl: string | null; jugadores: number };

export async function getEquipos(): Promise<EquipoResumen[]> {
  const clubes = await prisma.club.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, escudoUrl: true, _count: { select: { jugadores: true } } },
  });
  return clubes.map((c) => ({ id: c.id, nombre: c.nombre, escudoUrl: c.escudoUrl, jugadores: c._count.jugadores }));
}

export type MvpResumen = {
  jugadorNombre: string;
  clubNombre: string;
  jornadaNumero: number;
  resultado: string;
};

// MVPs reales desde Acta.mvpJugador — nunca se elige un MVP por heurística
// propia, solo se muestran los que la Mesa ya dejó registrados.
export async function getMvpsRecientes(limit = 6): Promise<MvpResumen[]> {
  const actas = await prisma.acta.findMany({
    where: { mvpJugadorId: { not: null } },
    select: {
      resultadoLocal: true,
      resultadoVisitante: true,
      mvpJugador: { select: { nombre: true }, },
      partido: {
        select: {
          jornada: { select: { numero: true } },
          clubLocal: { select: { nombre: true } },
          clubVisitante: { select: { nombre: true } },
        },
      },
    },
    orderBy: { generadaAt: "desc" },
    take: limit,
  });

  return actas
    .filter((a) => a.mvpJugador)
    .map((a) => ({
      jugadorNombre: a.mvpJugador!.nombre,
      clubNombre: a.partido.clubLocal.nombre,
      jornadaNumero: a.partido.jornada.numero,
      resultado: `${a.partido.clubLocal.nombre} ${a.resultadoLocal} - ${a.resultadoVisitante} ${a.partido.clubVisitante.nombre}`,
    }));
}

export type ResumenEditorial = {
  jornadaNumero: number;
  partidoMasCerrado: { texto: string; diferencia: number } | null;
  mayorDiferencia: { texto: string; diferencia: number } | null;
  topAnotadorJornada: { texto: string; puntos: number } | null;
} | null;

// Frases simples derivadas de datos reales de la última jornada jugada —
// nada de texto generado por IA, solo agregaciones directas.
export async function getResumenEditorial(): Promise<ResumenEditorial> {
  const jornada = await getUltimaJornadaFinalizada();
  if (!jornada || jornada.partidos.length === 0) return null;

  const conMargen = jornada.partidos
    .filter((p) => p.resultadoLocal !== null && p.resultadoVisitante !== null)
    .map((p) => ({
      partido: p,
      diferencia: Math.abs((p.resultadoLocal as number) - (p.resultadoVisitante as number)),
    }));
  if (conMargen.length === 0) return null;

  const masCerrado = [...conMargen].sort((a, b) => a.diferencia - b.diferencia)[0];
  const mayorDif = [...conMargen].sort((a, b) => b.diferencia - a.diferencia)[0];

  const statsJornada = await prisma.jugadorPartidoStat.findMany({
    where: { partidoId: { in: jornada.partidos.map((p) => p.id) } },
    select: { puntos: true, jugador: { select: { nombre: true } }, club: { select: { nombre: true } } },
    orderBy: { puntos: "desc" },
    take: 1,
  });
  const topAnotador = statsJornada[0] ?? null;

  return {
    jornadaNumero: jornada.numero,
    partidoMasCerrado: masCerrado
      ? {
          texto: `${masCerrado.partido.clubLocal.nombre} ${masCerrado.partido.resultadoLocal} - ${masCerrado.partido.resultadoVisitante} ${masCerrado.partido.clubVisitante.nombre}`,
          diferencia: masCerrado.diferencia,
        }
      : null,
    mayorDiferencia: mayorDif
      ? {
          texto: `${mayorDif.partido.clubLocal.nombre} ${mayorDif.partido.resultadoLocal} - ${mayorDif.partido.resultadoVisitante} ${mayorDif.partido.clubVisitante.nombre}`,
          diferencia: mayorDif.diferencia,
        }
      : null,
    topAnotadorJornada: topAnotador
      ? { texto: `${topAnotador.jugador.nombre} (${topAnotador.club.nombre})`, puntos: topAnotador.puntos }
      : null,
  };
}

export type JornadaCompacta = {
  numero: number;
  fecha: Date | null;
  totalPartidos: number;
  finalizados: number;
};

// Vista resumida del fixture (módulo 8) — solo jornadas con partidos
// todavía no finalizados, para dar un vistazo de "lo que viene" sin
// duplicar el detalle completo de cada jornada (esa página pública no
// existe todavía).
export async function getProximasJornadas(limit = 4): Promise<JornadaCompacta[]> {
  const jornadas = await prisma.jornada.findMany({
    where: { partidos: { some: { estado: { in: ["PROGRAMADO", "CONFIRMADO", "EN_CURSO"] } } } },
    orderBy: { numero: "asc" },
    take: limit,
    select: { numero: true, fecha: true, partidos: { select: { estado: true } } },
  });
  return jornadas.map((j) => ({
    numero: j.numero,
    fecha: j.fecha,
    totalPartidos: j.partidos.length,
    finalizados: j.partidos.filter((p) => p.estado === "FINALIZADO").length,
  }));
}
