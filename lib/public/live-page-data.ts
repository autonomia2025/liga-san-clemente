import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";
import { describirEvento, extraerClock } from "@/lib/mesa/describir-evento";
import { calcularRelojActual, type EstadoRelojCalculado } from "@/lib/mesa/reloj";
import { leerReloj } from "@/lib/mesa/reloj-db";
import { calcularMinutosJugados, formatMinutosJugados } from "@/lib/mesa/minutos-jugados";

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
  enCancha: boolean;
  // null = no se pudo calcular con certeza (falta clockLabel en alguna
  // sustitución histórica) — nunca se inventa, la UI oculta la columna MIN.
  minutosLabel: string | null;
};

export type LivePlayerName = {
  id: string;
  name: string;
  initials: string;
};

// Una fila del Play by Play público. clockLabel es null para eventos
// anteriores a esta PR (no tenían reloj registrado) — nunca se inventa, la UI
// simplemente muestra el evento sin hora en ese caso. side: de qué lado de la
// cancha va (local/visitante) — neutral para inicio/fin de cuarto y partido.
export type PlayByPlayEntry = {
  id: string;
  cuarto: number;
  clockLabel: string | null;
  equipoAbbr: string | null;
  descripcion: string;
  valor: number | null;
  side: "local" | "visitante" | "neutral";
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
    playByPlay?: PlayByPlayEntry[];
    reloj?: EstadoRelojCalculado;
    jugadoresEnCanchaLocal?: LivePlayerName[];
    jugadoresEnCanchaVisitante?: LivePlayerName[];
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
      duracionCuartoMinutos: true,
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
      eventos: {
        where: { anulado: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          tipo: true,
          cuarto: true,
          anulado: true,
          jugadorId: true,
          clubId: true,
          detalle: true,
          createdAt: true,
        },
      },
    },
  });
  if (!partido) return null;

  const liveState = buildLiveMatchState(partido.eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  // Reloj real persistido (Partido.relojEstado/relojRestanteSegundos/
  // relojUltimoInicio) — misma fuente de verdad que usa Mesa. SQL crudo vía
  // leerReloj porque el cliente Prisma generado en desarrollo todavía no
  // conoce estos 3 campos (ver nota en lib/mesa/reloj.ts); no afecta a
  // producción, donde Vercel sí corre `prisma generate`.
  const relojDb = await leerReloj(partido.id);
  const reloj = relojDb ? calcularRelojActual(relojDb, new Date()) : undefined;

  // Roster presente en el partido (fuente real de quién juega) para nombres,
  // dorsal y quién está en cancha ahora mismo; puntos/faltas vienen de los
  // Maps ya calculados.
  const roster = await prisma.partidoJugador.findMany({
    where: { partidoId: partido.id, presente: true },
    select: {
      clubId: true,
      enCancha: true,
      jugador: { select: { id: true, nombre: true, numeroCamiseta: true } },
    },
  });

  const enCanchaIds = new Set(roster.filter((r) => r.enCancha).map((r) => r.jugador.id));
  const minutosPorJugador = calcularMinutosJugados({
    enCanchaActualIds: enCanchaIds,
    eventos: partido.eventos,
    duracionCuartoMinutos: partido.duracionCuartoMinutos,
    cuartoActivo: liveState.cuartoActivo,
    remainingSecondsActual: reloj?.remainingSeconds ?? null,
  });

  const toRow = (r: { clubId: string; enCancha: boolean; jugador: { id: string; nombre: string; numeroCamiseta: number | null } }): LiveBoxscoreRow => {
    const segundos = minutosPorJugador?.get(r.jugador.id);
    return {
      id: r.jugador.id,
      playerName: r.jugador.nombre,
      initials: initials(r.jugador.nombre),
      number: r.jugador.numeroCamiseta,
      points: liveState.puntosPorJugador.get(r.jugador.id) ?? 0,
      fouls: liveState.faltasPorJugador.get(r.jugador.id) ?? 0,
      enCancha: r.enCancha,
      minutosLabel: segundos != null ? formatMinutosJugados(segundos) : null,
    };
  };

  const homeBoxscore = roster.filter((r) => r.clubId === partido.clubLocalId).map(toRow);
  const awayBoxscore = roster.filter((r) => r.clubId === partido.clubVisitanteId).map(toRow);

  const toPlayerName = (r: { jugador: { id: string; nombre: string } }): LivePlayerName => ({
    id: r.jugador.id,
    name: r.jugador.nombre,
    initials: initials(r.jugador.nombre),
  });
  const jugadoresEnCanchaLocal = roster
    .filter((r) => r.clubId === partido.clubLocalId && r.enCancha)
    .map(toPlayerName);
  const jugadoresEnCanchaVisitante = roster
    .filter((r) => r.clubId === partido.clubVisitanteId && r.enCancha)
    .map(toPlayerName);

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

  // Play by Play: mismo describirEvento que usa la consola de Mesa para
  // "último evento" — una sola fuente de descripciones para Mesa y público.
  // Más reciente primero (eventos ya vienen asc por createdAt, se invierte).
  const nombresJugadores = new Map(roster.map((r) => [r.jugador.id, r.jugador.nombre]));
  const describirContext = {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
    clubLocalNombre: clubNombreCorto(partido.clubLocal.nombre),
    clubVisitanteNombre: clubNombreCorto(partido.clubVisitante.nombre),
    nombresJugadores,
  };

  const playByPlay: PlayByPlayEntry[] = [...partido.eventos]
    .reverse()
    .map((e) => {
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
      const side: PlayByPlayEntry["side"] =
        e.clubId === partido.clubLocalId ? "local" : e.clubId === partido.clubVisitanteId ? "visitante" : "neutral";
      return {
        id: e.id,
        cuarto: e.cuarto,
        clockLabel: clock?.clockLabel ?? null,
        equipoAbbr,
        descripcion: describirEvento(e, describirContext),
        valor: typeof valor === "number" ? valor : null,
        side,
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
    playByPlay,
    reloj,
    jugadoresEnCanchaLocal,
    jugadoresEnCanchaVisitante,
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
