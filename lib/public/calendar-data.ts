import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";

export type CalendarTeam = {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
};

export type CalendarMatchStatus = "scheduled" | "live" | "finished";

export type CalendarMatch = {
  id: string;
  jornada: string;
  fecha: Date | string | null;
  venue?: string | null;
  status: CalendarMatchStatus;
  homeTeam: CalendarTeam;
  awayTeam: CalendarTeam;
  homeScore?: number | null;
  awayScore?: number | null;
};

export type CalendarRound = {
  key: string;
  label: string;
  date?: Date | string | null;
  matches: CalendarMatch[];
};

export type CalendarPageData = {
  rounds: CalendarRound[];
};

type DbMatch = {
  id: string;
  fechaHora: Date | null;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  cancha: string | null;
  updatedAt: Date;
  jornada: { numero: number; nombre: string | null; fecha: Date | null };
  clubLocal: { nombre: string; escudoUrl: string | null };
  clubVisitante: { nombre: string; escudoUrl: string | null };
  acta: { resultadoLocal: number; resultadoVisitante: number } | null;
};

function teamRef(club: { nombre: string; escudoUrl: string | null }): CalendarTeam {
  return {
    name: clubNombreCorto(club.nombre),
    abbr: clubAbrev(club.nombre),
    logoUrl: clubLogoUrl(club.nombre) ?? club.escudoUrl ?? undefined,
    color: clubColor(club.nombre),
  };
}

function statusFromDb(estado: DbMatch["estado"]): CalendarMatchStatus {
  if (estado === "EN_CURSO") return "live";
  if (estado === "FINALIZADO") return "finished";
  return "scheduled";
}

function matchDate(match: DbMatch): Date | null {
  return match.fechaHora ?? match.jornada.fecha ?? null;
}

function sortValue(date: Date | null): number {
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function roundLabel(jornada: DbMatch["jornada"]): string {
  return jornada.nombre?.trim() || `Fecha ${jornada.numero}`;
}

function toCalendarMatch(match: DbMatch): CalendarMatch {
  return {
    id: match.id,
    jornada: roundLabel(match.jornada),
    fecha: matchDate(match),
    venue: match.cancha,
    status: statusFromDb(match.estado),
    homeTeam: teamRef(match.clubLocal),
    awayTeam: teamRef(match.clubVisitante),
    homeScore: match.acta?.resultadoLocal ?? null,
    awayScore: match.acta?.resultadoVisitante ?? null,
  };
}

export async function getCalendarPageData(): Promise<CalendarPageData> {
  const matches = await prisma.partido.findMany({
    select: {
      id: true,
      fechaHora: true,
      estado: true,
      cancha: true,
      updatedAt: true,
      jornada: { select: { numero: true, nombre: true, fecha: true } },
      clubLocal: { select: { nombre: true, escudoUrl: true } },
      clubVisitante: { select: { nombre: true, escudoUrl: true } },
      acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
    },
  });

  const sorted = [...matches].sort((a, b) => {
    const byRound = a.jornada.numero - b.jornada.numero;
    if (byRound !== 0) return byRound;
    const byDate = sortValue(matchDate(a)) - sortValue(matchDate(b));
    if (byDate !== 0) return byDate;
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });

  const rounds = new Map<number, CalendarRound>();

  sorted.forEach((match) => {
    const key = match.jornada.numero;
    const existing = rounds.get(key);
    const date = match.jornada.fecha ?? match.fechaHora ?? null;
    const round =
      existing ??
      ({
        key: `fecha-${match.jornada.numero}`,
        label: roundLabel(match.jornada),
        date,
        matches: [],
      } satisfies CalendarRound);

    round.matches.push(toCalendarMatch(match));
    rounds.set(key, round);
  });

  return { rounds: Array.from(rounds.values()) };
}
