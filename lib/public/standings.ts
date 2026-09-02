import { prisma } from "@/lib/db";
import { whereJornadaFase, type FaseStandings } from "@/lib/public/fase";

// Criterio de puntos de tabla — no hay uno oficial definido todavía por la
// liga, así que se usa el más simple y común en ligas amateur: victoria=2,
// derrota=1, no jugado=0. Si la liga define otro criterio más adelante,
// cambiar estas dos constantes alcanza (no hay que tocar el resto del
// cálculo).
const PUNTOS_VICTORIA = 2;
const PUNTOS_DERROTA = 1;

// Partidos ganados por W.O. (el equipo perdedor no se presentó) — el
// schema todavía no tiene un campo Acta.esWalkover, así que se marcan acá a
// mano mientras sea un caso puntual. El que pierde por W.O. no recibe el
// punto de "derrota jugada" (PUNTOS_DERROTA); el que gana sigue sumando
// PUNTOS_VICTORIA normal. Si esto empieza a repetirse seguido, conviene
// pasar esto a un campo real en Acta en vez de mantener esta lista a mano.
const PARTIDOS_WALKOVER = new Set<string>([
  "cmr2s5ned000jf5v4m2z0m3wo", // Fecha 4, JMM U19 0-20 Pumas — JMM U19 no se presentó
]);

export type StandingRow = {
  clubId: string;
  clubNombre: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number;
  pc: number;
  dif: number;
  pts: number;
};

// Tabla de posiciones calculada en vivo desde Partido (FINALIZADO) + Acta —
// nunca se guarda una tabla precalculada en la base. Solo cuentan partidos
// con Acta generada (resultado oficial real), nunca se infiere un resultado.
//
// El default es REGULAR y NO es un detalle: la tabla de posiciones es la de
// la fase regular, y el bracket de playoffs siembra sus cruces desde acá
// (ver getPlayoffsData). Si los partidos de playoffs contaran, apenas se
// jugara el primer cruce la siembra se recalcularía incluyéndolo y el bracket
// se desarmaría solo. Con este default el problema no existe por construcción,
// sin que ningún llamador tenga que acordarse de pedirlo.
//
// El tipo excluye "PLAYOFFS" a propósito: una tabla de posiciones de una
// eliminación directa (pj=1, pts=2) no significa nada, así que ni compila.
export async function getStandings(fase: FaseStandings = "REGULAR"): Promise<StandingRow[]> {
  const [clubes, partidos] = await Promise.all([
    prisma.club.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.partido.findMany({
      where: { estado: "FINALIZADO", acta: { isNot: null }, ...whereJornadaFase(fase) },
      select: {
        id: true,
        clubLocalId: true,
        clubVisitanteId: true,
        acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
      },
    }),
  ]);

  const filas = new Map<string, StandingRow>(
    clubes.map((c) => [
      c.id,
      { clubId: c.id, clubNombre: c.nombre, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, dif: 0, pts: 0 },
    ]),
  );

  for (const partido of partidos) {
    if (!partido.acta) continue;
    const { resultadoLocal, resultadoVisitante } = partido.acta;

    const local = filas.get(partido.clubLocalId);
    const visitante = filas.get(partido.clubVisitanteId);
    if (!local || !visitante) continue;

    local.pj += 1;
    visitante.pj += 1;
    local.pf += resultadoLocal;
    local.pc += resultadoVisitante;
    visitante.pf += resultadoVisitante;
    visitante.pc += resultadoLocal;

    const esWalkover = PARTIDOS_WALKOVER.has(partido.id);
    const puntosDerrota = esWalkover ? 0 : PUNTOS_DERROTA;

    if (resultadoLocal > resultadoVisitante) {
      local.pg += 1;
      local.pts += PUNTOS_VICTORIA;
      visitante.pp += 1;
      visitante.pts += puntosDerrota;
    } else if (resultadoVisitante > resultadoLocal) {
      visitante.pg += 1;
      visitante.pts += PUNTOS_VICTORIA;
      local.pp += 1;
      local.pts += puntosDerrota;
    }
    // Empate: no debería pasar en básquetbol, pero si pasara no se suma PG/PP
    // ni puntos de ningún lado — no se inventa un desempate.
  }

  for (const fila of filas.values()) {
    fila.dif = fila.pf - fila.pc;
  }

  return [...filas.values()].sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.pf - a.pf);
}
