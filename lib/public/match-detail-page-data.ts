import { prisma } from "@/lib/db";
import type { TipoEvento } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";
import { describirEvento, extraerClock } from "@/lib/mesa/describir-evento";
import { labelPeriodo } from "@/lib/mesa/live-match-state";

// Datos para la página pública /partido/[id] — detalle de un partido puntual
// (mayormente pensada para FINALIZADO, pero soporta cualquier estado para no
// romper si alguien llega acá con un link viejo o un partido que cambió de
// estado). Solo lectura; no escribe en DB, no toca Mesa/Admin.
//
// Fuente del marcador y boxscore: Acta + JugadorPartidoStat, NO se recalcula
// desde MatchEvent (a diferencia de /en-vivo). Motivo: esta página tiene que
// servir tanto partidos operados en vivo por Mesa (con timeline completo)
// como partidos importados históricamente (origen=IMPORTADO, sin ningún
// MatchEvent) — Acta/JugadorPartidoStat es el único dato que existe para
// ambos casos por igual. Los eventos (cuando existen) solo alimentan la
// sección de jugadas/timeline, no el marcador ni el boxscore.

export type MatchDetailStatus = "scheduled" | "live" | "finished";

export type MatchDetailTeamRef = {
  id: string;
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
};

export type MatchBoxscoreRow = {
  id: string;
  name: string;
  initials: string;
  number: number | null;
  points: number;
  // null = dato no disponible en la fuente (import histórico sin faltas
  // registradas) — nunca se inventa, la UI oculta la columna.
  fouls: number | null;
};

export type MatchEventView = {
  id: string;
  cuarto: number;
  periodLabel: string;
  clockLabel: string | null;
  teamAbbr: string | null;
  side: "local" | "visitante" | "neutral";
  description: string;
  value: number | null;
  isImportantFoul: boolean;
};

export type MatchDetailSummary = {
  totalEvents: number;
  totalPlayersWithStats: number;
  mvp: { id: string; name: string; teamAbbr: string } | null;
  topScorer: { id: string; name: string; teamAbbr: string; points: number } | null;
};

export type MatchDetailPageData = {
  match: {
    id: string;
    status: MatchDetailStatus;
    scheduledAt: Date | null;
    venue: string | null;
    jornadaLabel: string;
    homeTeam: MatchDetailTeamRef;
    awayTeam: MatchDetailTeamRef;
    homeScore: number | null;
    awayScore: number | null;
    winner: "home" | "away" | "draw" | null;
  };
  summary: MatchDetailSummary | null;
  boxscore: {
    home: MatchBoxscoreRow[];
    away: MatchBoxscoreRow[];
  };
  events: MatchEventView[];
  acta: {
    observaciones: string | null;
    resultadoLocal: number;
    resultadoVisitante: number;
  } | null;
};

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? "");
  return (a + b).toUpperCase();
}

function teamRef(id: string, club: { nombre: string; escudoUrl: string | null }): MatchDetailTeamRef {
  return {
    id,
    name: clubNombreCorto(club.nombre),
    abbr: clubAbrev(club.nombre),
    logoUrl: clubLogoUrl(club.nombre) ?? club.escudoUrl ?? undefined,
    color: clubColor(club.nombre),
  };
}

function statusFromDb(estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO"): MatchDetailStatus {
  if (estado === "EN_CURSO") return "live";
  if (estado === "FINALIZADO") return "finished";
  return "scheduled";
}

// Faltas que vale la pena destacar aparte del boxscore (no las personales de
// rutina) — mismo criterio de "importante" que usa Mesa para tipoFalta.
const FALTAS_IMPORTANTES = new Set(["TECNICA", "ANTIDEPORTIVA", "DESCALIFICANTE", "EXPULSION_DIRECTA"]);

function esFaltaImportante(tipo: TipoEvento, detalle: unknown): boolean {
  if (tipo !== "FALTA") return false;
  const tipoFalta =
    detalle && typeof detalle === "object" && !Array.isArray(detalle) && "tipoFalta" in detalle
      ? (detalle as { tipoFalta: unknown }).tipoFalta
      : null;
  return typeof tipoFalta === "string" && FALTAS_IMPORTANTES.has(tipoFalta);
}

type PartidoDetalle = {
  id: string;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  fechaHora: Date | null;
  cancha: string | null;
  clubLocalId: string;
  clubVisitanteId: string;
  jornada: { numero: number; nombre: string | null; fecha: Date | null };
  clubLocal: { nombre: string; escudoUrl: string | null };
  clubVisitante: { nombre: string; escudoUrl: string | null };
  acta: {
    resultadoLocal: number;
    resultadoVisitante: number;
    observacionesMesa: string | null;
    mvpJugador: { id: string; nombre: string; clubId: string } | null;
  } | null;
  jugadorStats: {
    jugadorId: string;
    clubId: string;
    puntos: number;
    faltas: number | null;
    jugador: { nombre: string; numeroCamiseta: number | null };
  }[];
  eventos: {
    id: string;
    tipo: TipoEvento;
    cuarto: number;
    jugadorId: string | null;
    clubId: string | null;
    detalle: Prisma.JsonValue | null;
    createdAt: Date;
  }[];
};

function buildBoxscore(partido: PartidoDetalle): { home: MatchBoxscoreRow[]; away: MatchBoxscoreRow[] } {
  const toRow = (s: PartidoDetalle["jugadorStats"][number]): MatchBoxscoreRow => ({
    id: s.jugadorId,
    name: s.jugador.nombre,
    initials: initials(s.jugador.nombre),
    number: s.jugador.numeroCamiseta,
    points: s.puntos,
    fouls: s.faltas,
  });

  return {
    home: partido.jugadorStats.filter((s) => s.clubId === partido.clubLocalId).map(toRow).sort((a, b) => b.points - a.points),
    away: partido.jugadorStats.filter((s) => s.clubId === partido.clubVisitanteId).map(toRow).sort((a, b) => b.points - a.points),
  };
}

function buildSummary(partido: PartidoDetalle): MatchDetailSummary | null {
  if (partido.jugadorStats.length === 0) return null;

  const abrevDe = (clubId: string) =>
    clubId === partido.clubLocalId ? clubAbrev(partido.clubLocal.nombre) : clubAbrev(partido.clubVisitante.nombre);

  const topScorerStat = [...partido.jugadorStats].sort((a, b) => b.puntos - a.puntos)[0];
  const topScorer =
    topScorerStat && topScorerStat.puntos > 0
      ? {
          id: topScorerStat.jugadorId,
          name: topScorerStat.jugador.nombre,
          teamAbbr: abrevDe(topScorerStat.clubId),
          points: topScorerStat.puntos,
        }
      : null;

  const mvpJugador = partido.acta?.mvpJugador;
  const mvp = mvpJugador ? { id: mvpJugador.id, name: mvpJugador.nombre, teamAbbr: abrevDe(mvpJugador.clubId) } : null;

  return {
    totalEvents: partido.eventos.length,
    totalPlayersWithStats: partido.jugadorStats.length,
    mvp,
    topScorer,
  };
}

function buildEvents(partido: PartidoDetalle): MatchEventView[] {
  if (partido.eventos.length === 0) return [];

  const nombresJugadores = new Map(partido.jugadorStats.map((s) => [s.jugadorId, s.jugador.nombre]));
  const context = {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
    clubLocalNombre: clubNombreCorto(partido.clubLocal.nombre),
    clubVisitanteNombre: clubNombreCorto(partido.clubVisitante.nombre),
    nombresJugadores,
  };

  return [...partido.eventos].reverse().map((e) => {
    const clock = extraerClock(e.detalle);
    const equipoAbbr =
      e.clubId === partido.clubLocalId
        ? clubAbrev(partido.clubLocal.nombre)
        : e.clubId === partido.clubVisitanteId
          ? clubAbrev(partido.clubVisitante.nombre)
          : null;
    const valor =
      e.tipo === "PUNTO" && e.detalle && typeof e.detalle === "object" && !Array.isArray(e.detalle) && "valor" in e.detalle
        ? (e.detalle as { valor: unknown }).valor
        : null;
    const side: MatchEventView["side"] =
      e.clubId === partido.clubLocalId ? "local" : e.clubId === partido.clubVisitanteId ? "visitante" : "neutral";

    return {
      id: e.id,
      cuarto: e.cuarto,
      periodLabel: labelPeriodo(e.cuarto),
      clockLabel: clock?.clockLabel ?? null,
      teamAbbr: equipoAbbr,
      side,
      description: describirEvento(e, context),
      value: typeof valor === "number" ? valor : null,
      isImportantFoul: esFaltaImportante(e.tipo, e.detalle),
    };
  });
}

export async function getMatchDetailPageData(id: string): Promise<MatchDetailPageData | null> {
  const partido = await prisma.partido.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      fechaHora: true,
      cancha: true,
      clubLocalId: true,
      clubVisitanteId: true,
      jornada: { select: { numero: true, nombre: true, fecha: true } },
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
      acta: {
        select: {
          resultadoLocal: true,
          resultadoVisitante: true,
          observacionesMesa: true,
          mvpJugador: { select: { id: true, nombre: true, clubId: true } },
        },
      },
      jugadorStats: {
        select: {
          jugadorId: true,
          clubId: true,
          puntos: true,
          faltas: true,
          jugador: { select: { nombre: true, numeroCamiseta: true } },
        },
      },
      eventos: {
        where: { anulado: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, tipo: true, cuarto: true, jugadorId: true, clubId: true, detalle: true, createdAt: true },
      },
    },
  });

  if (!partido) return null;

  const resultadoLocal = partido.acta?.resultadoLocal ?? null;
  const resultadoVisitante = partido.acta?.resultadoVisitante ?? null;
  const winner: "home" | "away" | "draw" | null =
    resultadoLocal == null || resultadoVisitante == null
      ? null
      : resultadoLocal === resultadoVisitante
        ? "draw"
        : resultadoLocal > resultadoVisitante
          ? "home"
          : "away";

  return {
    match: {
      id: partido.id,
      status: statusFromDb(partido.estado),
      scheduledAt: partido.fechaHora ?? partido.jornada.fecha ?? null,
      venue: partido.cancha,
      jornadaLabel: partido.jornada.nombre?.trim() || `Fecha ${partido.jornada.numero}`,
      homeTeam: teamRef(partido.clubLocalId, partido.clubLocal),
      awayTeam: teamRef(partido.clubVisitanteId, partido.clubVisitante),
      homeScore: resultadoLocal,
      awayScore: resultadoVisitante,
      winner,
    },
    summary: buildSummary(partido),
    boxscore: buildBoxscore(partido),
    events: buildEvents(partido),
    acta: partido.acta
      ? {
          observaciones: partido.acta.observacionesMesa,
          resultadoLocal: partido.acta.resultadoLocal,
          resultadoVisitante: partido.acta.resultadoVisitante,
        }
      : null,
  };
}
