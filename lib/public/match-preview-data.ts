import { prisma } from "@/lib/db";
import { getStandings } from "@/lib/public/standings";
import { getTopScorers } from "@/lib/public/rankings";
import { clubAbrev, clubNombreCorto } from "@/lib/public/display";

// Previa de un partido programado (/partido/[id] antes de jugarse): qué está
// en juego, cómo llega cada equipo, el historial entre ambos esta temporada y
// a quién mirar. Todo sale de datos reales ya cargados — tabla de fase
// regular, actas, stats por jugador — y nada se inventa: si un dato no existe
// (ej. no se enfrentaron nunca), la sección correspondiente queda vacía y la
// UI la oculta.

export type PreviewLeader = {
  jugadorId: string;
  nombre: string;
  puntos: number;
  partidos: number;
  promedio: number;
};

export type PreviewPlayoffResult = {
  partidoId: string;
  rondaLabel: string;
  rivalName: string;
  rivalAbbr: string;
  puntosPropios: number;
  puntosRival: number;
  gano: boolean;
  // Máximo anotador del equipo en ese partido (si hay stats por jugador).
  figura: { nombre: string; puntos: number } | null;
};

export type PreviewTeam = {
  clubId: string;
  // Posición final en la fase regular (null si no figura en la tabla).
  posicion: number | null;
  pg: number | null;
  pp: number | null;
  puntosPorPartido: number | null;
  recibidosPorPartido: number | null;
  camino: PreviewPlayoffResult[];
  lideres: PreviewLeader[];
};

export type PreviewHeadToHead = {
  partidoId: string;
  jornadaLabel: string;
  fecha: Date | null;
  // Siempre desde la perspectiva del partido que se previa: "home" es el
  // local del partido programado, sin importar quién fue local en el cruce
  // anterior.
  puntosHome: number;
  puntosAway: number;
  ganador: "home" | "away" | "draw";
  // Quién fue local en ese partido anterior (para mostrar "en cancha de X").
  localEra: "home" | "away";
};

export type MatchPreview = {
  // Qué define este partido ("El ganador juega la final"); null en fase
  // regular, donde no hay una consecuencia única que contar.
  enJuego: string | null;
  esCopaPlata: boolean;
  home: PreviewTeam;
  away: PreviewTeam;
  cruces: PreviewHeadToHead[];
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function enJuegoDe(fase: string, nombre: string | null): { texto: string | null; plata: boolean } {
  if (fase !== "PLAYOFFS" || !nombre) return { texto: null, plata: false };
  const n = normalizar(nombre);
  if (n.includes("plata")) {
    return n.includes("final")
      ? { texto: "Se define el campeón de la Copa de Plata", plata: true }
      : { texto: "El ganador juega la final de la Copa de Plata", plata: true };
  }
  if (n.includes("cuartos")) return { texto: "El ganador avanza a semifinales", plata: false };
  if (n.includes("semi")) return { texto: "El ganador juega la final por el título", plata: false };
  if (n.includes("tercer")) return { texto: "Se define el tercer lugar de la temporada", plata: false };
  if (n.includes("final")) return { texto: "Se define el campeón 2026", plata: false };
  return { texto: null, plata: false };
}

function jornadaLabel(j: { numero: number; nombre: string | null }): string {
  return j.nombre?.trim() || `Fecha ${j.numero}`;
}

function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getMatchPreview(partidoId: string): Promise<MatchPreview | null> {
  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    select: {
      id: true,
      fechaHora: true,
      clubLocalId: true,
      clubVisitanteId: true,
      jornada: { select: { numero: true, nombre: true, fase: true } },
    },
  });
  if (!partido) return null;

  const homeId = partido.clubLocalId;
  const awayId = partido.clubVisitanteId;
  const ids = [homeId, awayId];

  const [standings, cruces, playoffsJugados, goleadores] = await Promise.all([
    getStandings("REGULAR"),
    prisma.partido.findMany({
      where: {
        id: { not: partido.id },
        estado: "FINALIZADO",
        acta: { isNot: null },
        OR: [
          { clubLocalId: homeId, clubVisitanteId: awayId },
          { clubLocalId: awayId, clubVisitanteId: homeId },
        ],
      },
      orderBy: [{ fechaHora: { sort: "asc", nulls: "first" } }, { updatedAt: "asc" }],
      select: {
        id: true,
        fechaHora: true,
        clubLocalId: true,
        jornada: { select: { numero: true, nombre: true, fecha: true } },
        acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
      },
    }),
    prisma.partido.findMany({
      where: {
        id: { not: partido.id },
        estado: "FINALIZADO",
        acta: { isNot: null },
        jornada: { fase: "PLAYOFFS" },
        OR: [{ clubLocalId: { in: ids } }, { clubVisitanteId: { in: ids } }],
      },
      orderBy: [{ fechaHora: { sort: "asc", nulls: "first" } }],
      select: {
        id: true,
        clubLocalId: true,
        clubVisitanteId: true,
        jornada: { select: { numero: true, nombre: true } },
        clubLocal: { select: { nombre: true } },
        clubVisitante: { select: { nombre: true } },
        acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
        jugadorStats: {
          orderBy: { puntos: "desc" },
          select: { clubId: true, puntos: true, jugador: { select: { nombre: true } } },
        },
      },
    }),
    // TOTAL (fase regular + playoffs): mismo número que muestran la home y
    // /goleadores para cada jugador.
    getTopScorers(500, "TOTAL"),
  ]);

  const armarEquipo = (clubId: string): PreviewTeam => {
    const idx = standings.findIndex((r) => r.clubId === clubId);
    const fila = idx >= 0 ? standings[idx] : null;
    const pj = fila?.pj ?? 0;

    const camino: PreviewPlayoffResult[] = playoffsJugados
      .filter((p) => p.clubLocalId === clubId || p.clubVisitanteId === clubId)
      .map((p) => {
        const esLocal = p.clubLocalId === clubId;
        const propios = esLocal ? p.acta!.resultadoLocal : p.acta!.resultadoVisitante;
        const rival = esLocal ? p.acta!.resultadoVisitante : p.acta!.resultadoLocal;
        const rivalNombre = esLocal ? p.clubVisitante.nombre : p.clubLocal.nombre;
        const top = p.jugadorStats.find((s) => s.clubId === clubId && s.puntos > 0);
        return {
          partidoId: p.id,
          rondaLabel: jornadaLabel(p.jornada),
          rivalName: clubNombreCorto(rivalNombre),
          rivalAbbr: clubAbrev(rivalNombre),
          puntosPropios: propios,
          puntosRival: rival,
          gano: propios > rival,
          figura: top ? { nombre: top.jugador.nombre, puntos: top.puntos } : null,
        };
      });

    const lideres: PreviewLeader[] = goleadores
      .filter((g) => g.clubId === clubId && g.puntosTotal > 0)
      .slice(0, 2)
      .map((g) => ({
        jugadorId: g.jugadorId,
        nombre: g.nombre,
        puntos: g.puntosTotal,
        partidos: g.partidosJugados,
        promedio: redondear1(g.promedio),
      }));

    return {
      clubId,
      posicion: fila && pj > 0 ? idx + 1 : null,
      pg: fila ? fila.pg : null,
      pp: fila ? fila.pp : null,
      puntosPorPartido: fila && pj > 0 ? redondear1(fila.pf / pj) : null,
      recibidosPorPartido: fila && pj > 0 ? redondear1(fila.pc / pj) : null,
      camino,
      lideres,
    };
  };

  const historial: PreviewHeadToHead[] = cruces.map((c) => {
    const homeEraLocal = c.clubLocalId === homeId;
    const puntosHome = homeEraLocal ? c.acta!.resultadoLocal : c.acta!.resultadoVisitante;
    const puntosAway = homeEraLocal ? c.acta!.resultadoVisitante : c.acta!.resultadoLocal;
    return {
      partidoId: c.id,
      jornadaLabel: jornadaLabel(c.jornada),
      fecha: c.fechaHora ?? c.jornada.fecha,
      puntosHome,
      puntosAway,
      ganador: puntosHome === puntosAway ? "draw" : puntosHome > puntosAway ? "home" : "away",
      localEra: homeEraLocal ? "home" : "away",
    };
  });

  const { texto, plata } = enJuegoDe(partido.jornada.fase, partido.jornada.nombre);

  return {
    enJuego: texto,
    esCopaPlata: plata,
    home: armarEquipo(homeId),
    away: armarEquipo(awayId),
    cruces: historial,
  };
}
