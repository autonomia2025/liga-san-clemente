import { prisma } from "@/lib/db";
import { getStandings } from "@/lib/public/standings";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";
import { rondaDeJornada, rondaPlataDeJornada, type RondaPlayoff } from "@/lib/public/fase";

// Datos para la página pública /playoffs — bracket de eliminación directa a
// partido único, con cruces 1v8, 2v7, 3v6, 4v5 sembrados desde la tabla final
// de la fase regular (getStandings, no se recalcula nada acá).
//
// Los partidos de playoffs son `Partido` normales, agrupados en `Jornada` con
// `fase = PLAYOFFS` y nombre propio ("Cuartos de Final", "Semifinales",
// "Tercer Lugar", "Final"). Eso permite que la Mesa los opere exactamente
// igual que cualquier partido de fase regular, y que el detalle público
// (/partido/[id]), boxscore y play-by-play funcionen sin tocar nada.
//
// Cada llave del bracket se resuelve buscando un Partido de playoffs cuyos dos
// clubes coincidan con los que deberían enfrentarse en ese cruce. Mientras ese
// partido no exista (o mientras no se conozcan los clasificados), la llave
// queda en estado "por definir" — nunca se inventa un cruce ni un resultado.

export type PlayoffRound = RondaPlayoff;

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

// Copa de Plata: torneo consuelo de los cuatro eliminados en cuartos. Mismo
// formato (semis a partido único + final), sembrado igual que el cuadro
// principal pero con los perdedores: perdedor(qf1) vs perdedor(qf2) y
// perdedor(qf3) vs perdedor(qf4). Secundaria a propósito — la página la
// muestra debajo del bracket, en plateado, sin competirle al título.
export type CopaPlataData = {
  semifinals: PlayoffMatchup[];
  final: PlayoffMatchup;
  champion: PlayoffTeam | null;
};

// En qué punto está el cuadro principal: la ronda más avanzada que ya tiene
// partidos creados. null = todavía no hay ningún partido de playoffs.
export type PlayoffEtapa = "cuartos" | "semis" | "final" | "campeon";

export type PlayoffsData = {
  seeds: PlayoffTeam[];
  quarterfinals: PlayoffMatchup[];
  semifinals: PlayoffMatchup[];
  thirdPlace: PlayoffMatchup;
  final: PlayoffMatchup;
  champion: PlayoffTeam | null;
  copaPlata: CopaPlataData;
  etapa: PlayoffEtapa | null;
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

// La detección de ronda por nombre de jornada vive en lib/public/fase.ts
// (rondaDeJornada / rondaPlataDeJornada), compartida con season-phase.ts.

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
  label: string = NOMBRE_RONDA[round],
): PlayoffMatchup {
  const base: PlayoffMatchup = {
    key,
    round,
    label,
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
    // REGULAR explícito aunque ya sea el default: este es EL punto donde la
    // contaminación con resultados de playoffs desarma el bracket, así que
    // conviene que se lea en el call site y no dependa del default.
    getStandings("REGULAR"),
    prisma.jornada.findMany({
      select: {
        nombre: true,
        fase: true,
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
    // "Fase regular pendiente" por el campo fase, no por `nombre: null`: la
    // Jornada 1 tiene nombre "Jornada 1" (viene del seed), así que con el
    // criterio viejo un partido pendiente de esa fecha no se contaba y la
    // siembra se declaraba definitiva de más.
    prisma.partido.count({
      where: { estado: { not: "FINALIZADO" }, jornada: { fase: "REGULAR" } },
    }),
  ]);

  // Cuadro principal y Copa de Plata en listas separadas: buildMatchup busca
  // por ronda + clubes, y los mismos clubes nunca se cruzan en ambas, pero así
  // ni siquiera existe la posibilidad de que un partido de la copa se bindee
  // en una llave del título.
  const partidosPlayoff: PartidoPlayoff[] = [];
  const partidosPlata: PartidoPlayoff[] = [];
  for (const j of jornadas) {
    const rondaTitulo = rondaDeJornada(j.fase, j.nombre);
    const rondaPlata = rondaPlataDeJornada(j.fase, j.nombre);
    const ronda = rondaTitulo ?? rondaPlata;
    if (!ronda) continue;
    const destino = rondaTitulo ? partidosPlayoff : partidosPlata;
    for (const p of j.partidos) {
      destino.push({
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

  // Copa de Plata: los perdedores de cuartos, con el mismo cruce de mitades
  // que el cuadro principal (izquierda: qf1/qf2, derecha: qf3/qf4).
  const [ps1Home, ps1Away] = porSiembra(qf1.loser, qf2.loser);
  const [ps2Home, ps2Away] = porSiembra(qf3.loser, qf4.loser);
  const ps1 = buildMatchup("plata-sf1", "semis", ps1Home, ps1Away, partidosPlata, "Copa de Plata · Semifinal");
  const ps2 = buildMatchup("plata-sf2", "semis", ps2Home, ps2Away, partidosPlata, "Copa de Plata · Semifinal");
  const [pfHome, pfAway] = porSiembra(ps1.winner, ps2.winner);
  const plataFinal = buildMatchup("plata-final", "final", pfHome, pfAway, partidosPlata, "Final Copa de Plata");

  const creado = (m: PlayoffMatchup) => m.partidoId !== null;
  const etapa: PlayoffEtapa | null = final.winner
    ? "campeon"
    : creado(final)
      ? "final"
      : [sf1, sf2].some(creado)
        ? "semis"
        : [qf1, qf2, qf3, qf4].some(creado)
          ? "cuartos"
          : null;

  return {
    seeds,
    quarterfinals: [qf1, qf2, qf3, qf4],
    semifinals: [sf1, sf2],
    thirdPlace,
    final,
    champion: final.winner,
    copaPlata: { semifinals: [ps1, ps2], final: plataFinal, champion: plataFinal.winner },
    etapa,
    seedingDefinitiva: regularPendientes === 0 && seeds.length === 8,
  };
}
