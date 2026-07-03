import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubNombreCorto } from "@/lib/public/display";
import { getStandings } from "@/lib/public/standings";
import { getTopScorers } from "@/lib/public/rankings";

// Datos para la página pública /equipo/[slug]. Reutiliza getStandings() (tabla
// real desde Partido FINALIZADO + Acta) y getTopScorers() (ranking real desde
// JugadorPartidoStat) sin duplicar sus cálculos — solo se filtra el resultado
// al club pedido. El roster viene de Jugador.clubId directamente (roster
// persistente del club), no de PartidoJugador (que es presencia por partido,
// cosa de Mesa). Solo lectura; no escribe en DB.

export type TeamMatchStatus = "scheduled" | "live" | "finished";

export type TeamPageTeam = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  abbr: string;
  logoUrl?: string | null;
  color: string;
};

export type TeamStandingSummary = {
  position?: number | null;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  tablePoints: number;
};

type MatchTeamRef = {
  name: string;
  abbr: string;
  logoUrl?: string | null;
  color?: string;
};

export type TeamMatchSummary = {
  id: string;
  date?: string | Date | null;
  jornada?: string | null;
  venue?: string | null;
  status: TeamMatchStatus;
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  homeScore?: number | null;
  awayScore?: number | null;
  isHome: boolean;
  result?: "win" | "loss" | "pending" | null;
};

export type TeamRosterPlayer = {
  id: string;
  name: string;
  initials: string;
  number?: string | number | null;
};

export type TeamTopScorer = {
  id: string;
  name: string;
  initials: string;
  points: number;
  games?: number;
};

export type TeamPageData = {
  team: TeamPageTeam;
  standing?: TeamStandingSummary | null;
  recentMatches: TeamMatchSummary[];
  upcomingMatches: TeamMatchSummary[];
  roster: TeamRosterPlayer[];
  topScorers: TeamTopScorer[];
};

// Mismo criterio que usa TeamsGrid (vía lib/public/home-live-data.ts) para
// generar los links /equipo/[slug]: slugify del nombre oficial del club (no
// del nombre corto de display). Se duplica acá a propósito, en vez de
// exportarla desde home-live-data.ts, para no tocar ningún archivo que
// alimente la Home.
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? "");
  return (a + b).toUpperCase();
}

function statusFromDb(estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO"): TeamMatchStatus {
  if (estado === "EN_CURSO") return "live";
  if (estado === "FINALIZADO") return "finished";
  return "scheduled";
}

function sortValue(date: Date | null): number {
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function teamRef(club: { nombre: string; escudoUrl: string | null }): MatchTeamRef {
  return {
    name: clubNombreCorto(club.nombre),
    abbr: clubAbrev(club.nombre),
    logoUrl: club.escudoUrl ?? undefined,
    color: clubColor(club.nombre),
  };
}

async function resolveClubBySlug(slug: string) {
  const clubes = await prisma.club.findMany({ select: { id: true, nombre: true, escudoUrl: true } });
  return clubes.find((c) => slugify(c.nombre) === slug) ?? null;
}

async function loadStandingSummary(clubId: string): Promise<TeamStandingSummary | null> {
  const rows = await getStandings();
  const idx = rows.findIndex((r) => r.clubId === clubId);
  if (idx === -1) return null;
  const row = rows[idx];

  // El equipo todavía no jugó ningún partido oficial: no hay ranking real que
  // mostrar (la posición entre equipos con 0 PJ es un artefacto del orden de
  // desempate, no un hecho). La página muestra el estado calmado en su lugar.
  if (row.pj === 0) return null;

  return {
    position: idx + 1,
    played: row.pj,
    wins: row.pg,
    losses: row.pp,
    pointsFor: row.pf,
    pointsAgainst: row.pc,
    pointDiff: row.dif,
    tablePoints: row.pts,
  };
}

async function loadRecentMatches(clubId: string, limit = 3): Promise<TeamMatchSummary[]> {
  const partidos = await prisma.partido.findMany({
    where: {
      estado: "FINALIZADO",
      acta: { isNot: null },
      OR: [{ clubLocalId: clubId }, { clubVisitanteId: clubId }],
    },
    orderBy: [{ fechaHora: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      fechaHora: true,
      cancha: true,
      clubLocalId: true,
      jornada: { select: { numero: true, nombre: true, fecha: true } },
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
      acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
    },
  });

  return partidos.map((p) => {
    const isHome = p.clubLocalId === clubId;
    const golesPropios = isHome ? p.acta!.resultadoLocal : p.acta!.resultadoVisitante;
    const golesRival = isHome ? p.acta!.resultadoVisitante : p.acta!.resultadoLocal;
    const result: TeamMatchSummary["result"] =
      golesPropios > golesRival ? "win" : golesPropios < golesRival ? "loss" : "pending";

    return {
      id: p.id,
      date: p.fechaHora ?? p.jornada.fecha,
      jornada: p.jornada.nombre?.trim() || `Fecha ${p.jornada.numero}`,
      venue: p.cancha,
      status: "finished",
      homeTeam: teamRef(p.clubLocal),
      awayTeam: teamRef(p.clubVisitante),
      homeScore: p.acta!.resultadoLocal,
      awayScore: p.acta!.resultadoVisitante,
      isHome,
      result,
    };
  });
}

async function loadUpcomingMatches(clubId: string, limit = 3): Promise<TeamMatchSummary[]> {
  const partidos = await prisma.partido.findMany({
    where: {
      estado: { in: ["PROGRAMADO", "CONFIRMADO"] },
      OR: [{ clubLocalId: clubId }, { clubVisitanteId: clubId }],
    },
    select: {
      id: true,
      fechaHora: true,
      estado: true,
      cancha: true,
      clubLocalId: true,
      jornada: { select: { numero: true, nombre: true, fecha: true } },
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
    },
  });

  const conFecha = partidos
    .map((p) => ({ p, fecha: p.fechaHora ?? p.jornada.fecha }))
    .sort((a, b) => sortValue(a.fecha) - sortValue(b.fecha))
    .slice(0, limit);

  return conFecha.map(({ p, fecha }) => ({
    id: p.id,
    date: fecha,
    jornada: p.jornada.nombre?.trim() || `Fecha ${p.jornada.numero}`,
    venue: p.cancha,
    status: statusFromDb(p.estado),
    homeTeam: teamRef(p.clubLocal),
    awayTeam: teamRef(p.clubVisitante),
    isHome: p.clubLocalId === clubId,
    result: null,
  }));
}

async function loadRoster(clubId: string): Promise<TeamRosterPlayer[]> {
  const jugadores = await prisma.jugador.findMany({
    where: { clubId, activo: true },
    orderBy: [{ numeroCamiseta: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, numeroCamiseta: true },
  });
  return jugadores.map((j) => ({ id: j.id, name: j.nombre, initials: initials(j.nombre), number: j.numeroCamiseta }));
}

async function loadTopScorers(clubNombre: string, limit = 3): Promise<TeamTopScorer[]> {
  // getTopScorers() ya agrega y ordena todo JugadorPartidoStat por jugador;
  // acá solo se reutiliza y se filtra al club, sin repetir la agregación.
  const todos = await getTopScorers(1000);
  return todos
    .filter((t) => t.clubNombre === clubNombre)
    .slice(0, limit)
    .map((t) => ({ id: t.jugadorId, name: t.nombre, initials: initials(t.nombre), points: t.puntosTotal, games: t.partidosJugados }));
}

export async function getTeamPageData(slug: string): Promise<TeamPageData | null> {
  const club = await resolveClubBySlug(slug);
  if (!club) return null;

  const [standing, recentMatches, upcomingMatches, roster, topScorers] = await Promise.all([
    loadStandingSummary(club.id),
    loadRecentMatches(club.id),
    loadUpcomingMatches(club.id),
    loadRoster(club.id),
    loadTopScorers(club.nombre),
  ]);

  const shortName = clubNombreCorto(club.nombre);

  return {
    team: {
      id: club.id,
      slug,
      name: shortName,
      shortName,
      abbr: clubAbrev(club.nombre),
      logoUrl: club.escudoUrl,
      color: clubColor(club.nombre),
    },
    standing,
    recentMatches,
    upcomingMatches,
    roster,
    topScorers,
  };
}
