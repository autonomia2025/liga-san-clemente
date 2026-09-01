import { prisma } from "@/lib/db";
import { getStandings } from "@/lib/public/standings";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";

// Datos para la página pública /playoffs — bracket de eliminación directa a
// partido único, con cruces 1v8, 2v7, 3v6, 4v5 sembrados desde la tabla final
// de la fase regular (getStandings, no se recalcula nada acá).
//
// No hay modelo nuevo en el schema: los partidos de playoffs son `Partido`
// normales, agrupados en `Jornada` con nombre propio ("Cuartos de Final",
// "Semifinales", "Tercer Lugar", "Final"). Eso permite que la Mesa los opere
// exactamente igual que cualquier partido de fase regular, y que el detalle
// público (/partido/[id]), boxscore y play-by-play funcionen sin tocar nada.
//
// Cada llave del bracket se resuelve buscando un Partido de playoffs cuyos dos
// clubes coincidan con los que deberían enfrentarse en ese cruce. Mientras ese
// partido no exista (o mientras no se conozcan los clasificados), la llave
// queda en estado "por definir" — nunca se inventa un cruce ni un resultado.

export type PlayoffRound = "cuartos" | "semis" | "tercer" | "final";

export type PlayoffTeam = {
  seed: number;
  clubId: string;
  name: string;
  abbr: string;
  logoUrl?: string;
  color: string;
  slug: string;
};

export type PlayoffMatchup = {
  key: string;
  round: PlayoffRound;
  label: string;
  home: PlayoffTeam | null;
  away: PlayoffTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "pending" | "scheduled" | "live" | "finished";
  partidoId: string | null;
  scheduledAt: Date | null;
  winner: PlayoffTeam | null;
  loser: PlayoffTeam | null;
};

export type PlayoffsData = {
  seeds: PlayoffTeam[];
  quarterfinals: PlayoffMatchup[];
  semifinals: PlayoffMatchup[];
  thirdPlace: PlayoffMatchup;
  final: PlayoffMatchup;
  champion: PlayoffTeam | null;
  // false mientras queden partidos de fase regular sin jugar — la siembra
  // todavía puede cambiar, y la página lo advierte en vez de presentarla
  // como definitiva.
  seedingDefinitiva: boolean;
};

// Mismo slugify que team-page-data.ts (a partir del nombre oficial del club),
// para que los links a /equipo/[slug] resuelvan igual que en el resto del sitio.
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NOMBRE_RONDA: Record<PlayoffRound, string> = {
  cuartos: "Cuartos de Final",
  semis: "Semifinales",
  tercer: "Tercer Lugar",
  final: "Final",
};

// Detecta a qué ronda de playoffs pertenece una Jornada por su nombre. Las
// jornadas de fase regular (nombre null → "Fecha N") nunca matchean.
function rondaDeJornada(nombre: string | null): PlayoffRound | null {
  if (!nombre) return null;
  const n = nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (n.includes("cuartos")) return "cuartos";
  if (n.includes("semi")) return "semis";
  if (n.includes("tercer")) return "tercer";
  if (n.includes("final")) return "final";
  return null;
}

type PartidoPlayoff = {
  id: string;
  ronda: PlayoffRound;
  clubLocalId: string;
  clubVisitanteId: string;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  fechaHora: Date | null;
  jornadaFecha: Date | null;
  resultadoLocal: number | null;
  resultadoVisitante: number | null;
};

function teamFromStanding(
  seed: number,
  row: { clubId: string; clubNombre: string },
): PlayoffTeam {
  return {
    seed,
    clubId: row.clubId,
    name: clubNombreCorto(row.clubNombre),
    abbr: clubAbrev(row.clubNombre),
    logoUrl: clubLogoUrl(row.clubNombre),
    color: clubColor(row.clubNombre),
    slug: slugify(row.clubNombre),
  };
}

// Arma una llave del bracket: si ya se conocen los dos equipos, busca el
// Partido real que los enfrenta en esa ronda para traer estado y marcador.
function buildMatchup(
  key: string,
  round: PlayoffRound,
  home: PlayoffTeam | null,
  away: PlayoffTeam | null,
  partidos: PartidoPlayoff[],
): PlayoffMatchup {
  const base: PlayoffMatchup = {
    key,
    round,
    label: NOMBRE_RONDA[round],
    home,
    away,
    homeScore: null,
    awayScore: null,
    status: "pending",
    partidoId: null,
    scheduledAt: null,
    winner: null,
    loser: null,
  };

  if (!home || !away) return base;

  const partido = partidos.find(
    (p) =>
      p.ronda === round &&
      ((p.clubLocalId === home.clubId && p.clubVisitanteId === away.clubId) ||
        (p.clubLocalId === away.clubId && p.clubVisitanteId === home.clubId)),
  );

  if (!partido) return base;

  // El bracket siempre muestra al mejor sembrado arriba, sin importar quién
  // figure como local en el fixture — los marcadores se mapean al equipo que
  // corresponde, no a la posición local/visitante del Partido.
  const homeEsLocal = partido.clubLocalId === home.clubId;
  const homeScore = homeEsLocal ? partido.resultadoLocal : partido.resultadoVisitante;
  const awayScore = homeEsLocal ? partido.resultadoVisitante : partido.resultadoLocal;

  const status: PlayoffMatchup["status"] =
    partido.estado === "FINALIZADO" ? "finished" : partido.estado === "EN_CURSO" ? "live" : "scheduled";

  let winner: PlayoffTeam | null = null;
  let loser: PlayoffTeam | null = null;
  if (status === "finished" && homeScore != null && awayScore != null && homeScore !== awayScore) {
    const homeGana = homeScore > awayScore;
    winner = homeGana ? home : away;
    loser = homeGana ? away : home;
  }

  return {
    ...base,
    homeScore,
    awayScore,
    status,
    partidoId: partido.id,
    scheduledAt: partido.fechaHora ?? partido.jornadaFecha,
    winner,
    loser,
  };
}

export async function getPlayoffsData(): Promise<PlayoffsData> {
  const [standings, jornadas, regularPendientes] = await Promise.all([
    getStandings(),
    prisma.jornada.findMany({
      select: {
        nombre: true,
        fecha: true,
        partidos: {
          select: {
            id: true,
            clubLocalId: true,
            clubVisitanteId: true,
            estado: true,
            fechaHora: true,
            acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
          },
        },
      },
    }),
    prisma.partido.count({
      where: { estado: { not: "FINALIZADO" }, jornada: { nombre: null } },
    }),
  ]);

  const partidosPlayoff: PartidoPlayoff[] = [];
  for (const j of jornadas) {
    const ronda = rondaDeJornada(j.nombre);
    if (!ronda) continue;
    for (const p of j.partidos) {
      partidosPlayoff.push({
        id: p.id,
        ronda,
        clubLocalId: p.clubLocalId,
        clubVisitanteId: p.clubVisitanteId,
        estado: p.estado,
        fechaHora: p.fechaHora,
        jornadaFecha: j.fecha,
        resultadoLocal: p.acta?.resultadoLocal ?? null,
        resultadoVisitante: p.acta?.resultadoVisitante ?? null,
      });
    }
  }

  // Solo clasifican equipos con partidos jugados — un club sin actividad no
  // se siembra aunque exista en la tabla.
  const clasificados = standings.filter((r) => r.pj > 0).slice(0, 8);
  const seeds = clasificados.map((row, i) => teamFromStanding(i + 1, row));
  const seedAt = (n: number): PlayoffTeam | null => seeds[n - 1] ?? null;

  // Llave izquierda: 1v8 y 4v5. Llave derecha: 2v7 y 3v6.
  const qf1 = buildMatchup("qf1", "cuartos", seedAt(1), seedAt(8), partidosPlayoff);
  const qf2 = buildMatchup("qf2", "cuartos", seedAt(4), seedAt(5), partidosPlayoff);
  const qf3 = buildMatchup("qf3", "cuartos", seedAt(2), seedAt(7), partidosPlayoff);
  const qf4 = buildMatchup("qf4", "cuartos", seedAt(3), seedAt(6), partidosPlayoff);

  // En semis el mejor sembrado va arriba (menor número de siembra).
  const porSiembra = (a: PlayoffTeam | null, b: PlayoffTeam | null): [PlayoffTeam | null, PlayoffTeam | null] =>
    a && b ? (a.seed <= b.seed ? [a, b] : [b, a]) : [a, b];

  const [sf1Home, sf1Away] = porSiembra(qf1.winner, qf2.winner);
  const [sf2Home, sf2Away] = porSiembra(qf3.winner, qf4.winner);
  const sf1 = buildMatchup("sf1", "semis", sf1Home, sf1Away, partidosPlayoff);
  const sf2 = buildMatchup("sf2", "semis", sf2Home, sf2Away, partidosPlayoff);

  const [finalHome, finalAway] = porSiembra(sf1.winner, sf2.winner);
  const final = buildMatchup("final", "final", finalHome, finalAway, partidosPlayoff);

  const [tercerHome, tercerAway] = porSiembra(sf1.loser, sf2.loser);
  const thirdPlace = buildMatchup("tercer", "tercer", tercerHome, tercerAway, partidosPlayoff);

  return {
    seeds,
    quarterfinals: [qf1, qf2, qf3, qf4],
    semifinals: [sf1, sf2],
    thirdPlace,
    final,
    champion: final.winner,
    seedingDefinitiva: regularPendientes === 0 && seeds.length === 8,
  };
}
