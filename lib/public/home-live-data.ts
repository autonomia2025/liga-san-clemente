import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubNombreCorto } from "@/lib/public/display";
import { getStandings } from "@/lib/public/standings";
import { getTopScorers } from "@/lib/public/rankings";
import { getEquipos, getHeroData } from "@/lib/public/home-data";
import type { MatchFeatureProps } from "@/components/site/match-feature";
import type { StandingPreviewTeam } from "@/components/site/standings-preview";
import type { FeaturedMvp, SeasonLeader } from "@/components/site/mvp-leaders-section";
import type { TeamGridItem } from "@/components/site/teams-grid";

// Capa de datos ÚNICA para la Home pública. Reutiliza los helpers públicos
// existentes (getHeroData, getStandings, getTopScorers, getEquipos, display.*)
// y solo agrega queries puntuales para lo que no existía (MVP con puntos +
// resultado, cancha del partido destacado). No toca schema, Admin, Mesa ni
// importadores; solo lectura.
//
// Cada módulo se carga aislado (try/catch + timeout): si una query falla o
// tarda demasiado, ese módulo cae a estado de error sin voltear el resto de la
// Home. Nunca se inventan datos: si algo no existe, se devuelve vacío/undefined.

export type Loaded<T> = { ok: true; data: T } | { ok: false };

export type MvpData = {
  featuredMvp?: FeaturedMvp;
  seasonLeaders: SeasonLeader[];
};

export type HomePageData = {
  isLiveNow: boolean;
  matchFeature: Loaded<MatchFeatureProps>;
  standings: Loaded<StandingPreviewTeam[]>;
  mvp: Loaded<MvpData>;
  teams: Loaded<TeamGridItem[]>;
};

/* ---- utilidades ---------------------------------------------------------- */

// Timeout por bloque: si la promesa no resuelve en `ms`, rechaza (el bloque
// pasa a error y no queda skeleton infinito). No es un timeout global.
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("home-data timeout")), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

async function safe<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    const data = await withTimeout(fn(), 8000);
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0]?.charAt(1) ?? "";
  return (a + b).toUpperCase();
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function teamRef(club: { nombre: string; escudoUrl: string | null }) {
  return {
    name: clubNombreCorto(club.nombre),
    abbr: clubAbrev(club.nombre),
    logoUrl: club.escudoUrl ?? undefined,
    color: clubColor(club.nombre),
  };
}

async function canchaDe(partidoId: string): Promise<string | undefined> {
  const p = await prisma.partido.findUnique({ where: { id: partidoId }, select: { cancha: true } });
  return p?.cancha ?? undefined;
}

/* ---- loaders por módulo -------------------------------------------------- */

async function loadMatchFeature(): Promise<MatchFeatureProps> {
  const hero = await getHeroData();

  if (hero.tipo === "EN_VIVO") {
    const venue = await canchaDe(hero.partido.id);
    return {
      matchState: "live",
      homeTeam: teamRef(hero.partido.clubLocal),
      awayTeam: teamRef(hero.partido.clubVisitante),
      homeScore: hero.liveState.marcadorLocal,
      awayScore: hero.liveState.marcadorVisitante,
      // Sin reloj real confiable: se muestra el cuarto (o "EN CURSO"), no se
      // inventa un tiempo.
      periodLabel: hero.liveState.cuartoActivo ? `Q${hero.liveState.cuartoActivo}` : "EN CURSO",
      venue,
      // Líderes del partido en vivo requerirían boxscore en curso (no existe
      // hasta el acta): por ahora vacío (el módulo oculta la fila).
      leaders: [],
    };
  }

  if (hero.tipo === "PROXIMA_JORNADA") {
    const conFecha = hero.jornada.partidos.filter((p) => p.fechaHora);
    const proximo =
      [...conFecha].sort((a, b) => new Date(a.fechaHora as Date).getTime() - new Date(b.fechaHora as Date).getTime())[0] ??
      hero.jornada.partidos[0];
    if (!proximo) return { matchState: "none" };
    const venue = await canchaDe(proximo.id);
    return {
      matchState: "upcoming",
      homeTeam: teamRef(proximo.clubLocal),
      awayTeam: teamRef(proximo.clubVisitante),
      scheduledAt: proximo.fechaHora ?? undefined,
      venue,
    };
  }

  // ULTIMOS_RESULTADOS o VACIO: no hay live ni próximo confirmado.
  return { matchState: "none" };
}

async function loadStandings(): Promise<StandingPreviewTeam[]> {
  const [rows, clubs] = await Promise.all([
    getStandings(),
    prisma.club.findMany({ select: { id: true, escudoUrl: true } }),
  ]);
  const escudo = new Map(clubs.map((c) => [c.id, c.escudoUrl]));
  return rows.slice(0, 5).map((r, i) => ({
    position: i + 1,
    team: {
      name: clubNombreCorto(r.clubNombre),
      abbr: clubAbrev(r.clubNombre),
      logoUrl: escudo.get(r.clubId) ?? undefined,
      color: clubColor(r.clubNombre),
    },
    played: r.pj,
    wins: r.pg,
    losses: r.pp,
    pointDiff: r.dif,
    tablePoints: r.pts,
    // La racha real no está modelada en DB todavía → null (no se inventa).
    streak: null,
  }));
}

async function loadMvp(): Promise<MvpData> {
  // MVP del último partido finalizado con MVP registrado en el acta.
  let featuredMvp: FeaturedMvp | undefined;
  const acta = await prisma.acta.findFirst({
    where: { mvpJugadorId: { not: null } },
    orderBy: { generadaAt: "desc" },
    select: {
      resultadoLocal: true,
      resultadoVisitante: true,
      partido: {
        select: {
          id: true,
          clubLocal: { select: { nombre: true, escudoUrl: true } },
          clubVisitante: { select: { nombre: true, escudoUrl: true } },
        },
      },
      mvpJugador: { select: { id: true, nombre: true, club: { select: { nombre: true } } } },
    },
  });

  if (acta?.mvpJugador) {
    const stat = await prisma.jugadorPartidoStat.findUnique({
      where: { partidoId_jugadorId: { partidoId: acta.partido.id, jugadorId: acta.mvpJugador.id } },
      select: { puntos: true },
    });
    // Solo se arma el MVP si existe el puntaje real; no se inventa un número.
    if (stat) {
      const clubNombre = acta.mvpJugador.club.nombre;
      featuredMvp = {
        playerName: acta.mvpJugador.nombre,
        playerInitials: initials(acta.mvpJugador.nombre),
        teamName: clubNombreCorto(clubNombre),
        teamAbbr: clubAbrev(clubNombre),
        teamAccentColor: clubColor(clubNombre),
        points: stat.puntos,
        matchResult: {
          homeTeam: teamRef(acta.partido.clubLocal),
          awayTeam: teamRef(acta.partido.clubVisitante),
          homeScore: acta.resultadoLocal,
          awayScore: acta.resultadoVisitante,
        },
      };
    }
  }

  // Líderes de temporada: la DB solo trackea PUNTOS por jugador. No se
  // inventan rebotes/asistencias, así que solo se muestra "Líder en Puntos".
  const top = await getTopScorers(1);
  const seasonLeaders: SeasonLeader[] = top.map((t) => ({
    category: "Líder en Puntos",
    playerName: t.nombre,
    playerInitials: initials(t.nombre),
    teamName: clubNombreCorto(t.clubNombre),
    teamAbbr: clubAbrev(t.clubNombre),
    teamAccentColor: clubColor(t.clubNombre),
    value: t.puntosTotal,
    suffix: "PTS",
  }));

  return { featuredMvp, seasonLeaders };
}

async function loadTeams(): Promise<TeamGridItem[]> {
  const equipos = await getEquipos();

  // Posición/puntos vienen de standings; si standings falla acá, los equipos
  // igual se muestran (esos campos quedan null).
  const posPorClub = new Map<string, { pos: number; pts: number }>();
  try {
    const st = await getStandings();
    st.forEach((r, i) => {
      if (r.pj > 0) posPorClub.set(r.clubId, { pos: i + 1, pts: r.pts });
    });
  } catch {
    /* posición/puntos opcionales */
  }

  return equipos.map((e) => ({
    name: clubNombreCorto(e.nombre),
    slug: slugify(e.nombre),
    abbr: clubAbrev(e.nombre),
    logoUrl: e.escudoUrl ?? undefined,
    accentColor: clubColor(e.nombre),
    currentPosition: posPorClub.get(e.id)?.pos ?? null,
    tablePoints: posPorClub.get(e.id)?.pts ?? null,
  }));
}

/* ---- entrada única ------------------------------------------------------- */

export async function getHomePageData(): Promise<HomePageData> {
  const [matchFeature, standings, mvp, teams] = await Promise.all([
    safe(loadMatchFeature),
    safe(loadStandings),
    safe(loadMvp),
    safe(loadTeams),
  ]);

  const isLiveNow = matchFeature.ok && matchFeature.data.matchState === "live";

  return { isLiveNow, matchFeature, standings, mvp, teams };
}
