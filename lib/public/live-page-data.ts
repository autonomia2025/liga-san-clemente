import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";

// Datos para la página pública /en-vivo. Reutiliza buildLiveMatchState (capa
// de dominio ya usada por getHeroData para Home) para calcular marcador,
// cuarto y puntos/faltas por jugador a partir de MatchEvent — no se duplica
// esa lógica. Todo es solo lectura; no escribe en DB, no toca Mesa/Admin.
//
// Criterio si hubiera más de un partido EN_CURSO (no debería pasar con una
// sola cancha, pero por si acaso): se elige el más recientemente actualizado
// (orderBy updatedAt desc), no el primero por fecha.

export type LiveTeam = {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
};

export type LivePlayerStat = {
  id?: string;
  name: string;
  initials: string;
  teamAbbr?: string;
  points?: number;
  fouls?: number;
  rebounds?: number | null;
  assists?: number | null;
};

export type LiveBoxscoreRow = {
  id?: string;
  playerName: string;
  initials: string;
  number?: string | number | null;
  points: number;
  fouls?: number | null;
};

export type LiveGameData = {
  state: "live" | "upcoming" | "none";
  match?: {
    id: string;
    status: "live" | "upcoming" | "finished";
    periodLabel?: string;
    gameClock?: string;
    scheduledAt?: string | Date | null;
    venue?: string | null;
    homeTeam: LiveTeam;
    awayTeam: LiveTeam;
    homeScore?: number | null;
    awayScore?: number | null;
    leaders?: LivePlayerStat[];
    homeBoxscore?: LiveBoxscoreRow[];
    awayBoxscore?: LiveBoxscoreRow[];
  };
};

function teamRef(club: { nombre: string; escudoUrl: string | null }): LiveTeam {
  return {
    name: clubNombreCorto(club.nombre),
    abbr: clubAbrev(club.nombre),
    logoUrl: clubLogoUrl(club.nombre) ?? club.escudoUrl ?? undefined,
    color: clubColor(club.nombre),
  };
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? "");
  return (a + b).toUpperCase();
}

// Sin reloj real en el schema (MatchEvent no guarda tiempo transcurrido) —
// nunca se inventa. Solo se deriva el cuarto activo real desde los eventos.
function periodLabelFromCuarto(cuartoActivo: number | null): string {
  const ordinal: Record<number, string> = { 1: "1er cuarto", 2: "2do cuarto", 3: "3er cuarto", 4: "4to cuarto" };
  if (cuartoActivo && ordinal[cuartoActivo]) return ordinal[cuartoActivo].toUpperCase();
  return "EN CURSO";
}

function sortValue(date: Date | null): number {
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

async function loadLiveMatch(): Promise<LiveGameData["match"] | null> {
  const partido = await prisma.partido.findFirst({
    where: { estado: "EN_CURSO" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      cancha: true,
      clubLocalId: true,
      clubVisitanteId: true,
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
      eventos: {
        where: { anulado: false },
        orderBy: { createdAt: "asc" },
        select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
      },
    },
  });
  if (!partido) return null;

  const liveState = buildLiveMatchState(partido.eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  // Roster presente en el partido (fuente real de quién juega) para nombres y
  // dorsal del boxscore; puntos/faltas vienen de los Maps ya calculados.
  const roster = await prisma.partidoJugador.findMany({
    where: { partidoId: partido.id, presente: true },
    select: { clubId: true, jugador: { select: { id: true, nombre: true, numeroCamiseta: true } } },
  });

  const toRow = (jugador: { id: string; nombre: string; numeroCamiseta: number | null }): LiveBoxscoreRow => ({
    id: jugador.id,
    playerName: jugador.nombre,
    initials: initials(jugador.nombre),
    number: jugador.numeroCamiseta,
    points: liveState.puntosPorJugador.get(jugador.id) ?? 0,
    fouls: liveState.faltasPorJugador.get(jugador.id) ?? 0,
  });

  const homeBoxscore = roster.filter((r) => r.clubId === partido.clubLocalId).map((r) => toRow(r.jugador));
  const awayBoxscore = roster.filter((r) => r.clubId === partido.clubVisitanteId).map((r) => toRow(r.jugador));

  // Líderes: jugadores con puntos reales anotados en el partido, sin importar
  // equipo, top 4. Si nadie anotó todavía, queda vacío (no se inventa).
  const leaders: LivePlayerStat[] = [...homeBoxscore, ...awayBoxscore]
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
    .map((r) => {
      const esLocal = homeBoxscore.some((h) => h.id === r.id);
      const equipo = esLocal ? partido.clubLocal.nombre : partido.clubVisitante.nombre;
      return {
        id: r.id,
        name: r.playerName,
        initials: r.initials,
        teamAbbr: clubAbrev(equipo),
        points: r.points,
        fouls: r.fouls ?? undefined,
      };
    });

  return {
    id: partido.id,
    status: "live",
    periodLabel: periodLabelFromCuarto(liveState.cuartoActivo),
    scheduledAt: null,
    venue: partido.cancha,
    homeTeam: teamRef(partido.clubLocal),
    awayTeam: teamRef(partido.clubVisitante),
    homeScore: liveState.marcadorLocal,
    awayScore: liveState.marcadorVisitante,
    leaders,
    homeBoxscore,
    awayBoxscore,
  };
}

async function loadUpcomingMatch(): Promise<LiveGameData["match"] | null> {
  const candidatos = await prisma.partido.findMany({
    where: { estado: { in: ["PROGRAMADO", "CONFIRMADO"] } },
    select: {
      id: true,
      fechaHora: true,
      cancha: true,
      jornada: { select: { fecha: true } },
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
    },
  });
  if (candidatos.length === 0) return null;

  const conFecha = candidatos
    .map((p) => ({ p, fecha: p.fechaHora ?? p.jornada.fecha }))
    .sort((a, b) => sortValue(a.fecha) - sortValue(b.fecha));

  const proximo = conFecha[0];
  if (!proximo) return null;

  return {
    id: proximo.p.id,
    status: "upcoming",
    scheduledAt: proximo.fecha,
    venue: proximo.p.cancha,
    homeTeam: teamRef(proximo.p.clubLocal),
    awayTeam: teamRef(proximo.p.clubVisitante),
  };
}

export async function getLivePageData(): Promise<LiveGameData> {
  const live = await loadLiveMatch();
  if (live) return { state: "live", match: live };

  const upcoming = await loadUpcomingMatch();
  if (upcoming) return { state: "upcoming", match: upcoming };

  return { state: "none" };
}
