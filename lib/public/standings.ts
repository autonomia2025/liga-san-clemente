import { prisma } from "@/lib/db";

// Criterio de puntos de tabla — no hay uno oficial definido todavía por la
// liga, así que se usa el más simple y común en ligas amateur: victoria=2,
// derrota=1, no jugado=0. Si la liga define otro criterio más adelante,
// cambiar estas dos constantes alcanza (no hay que tocar el resto del
// cálculo).
const PUNTOS_VICTORIA = 2;
const PUNTOS_DERROTA = 1;

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
export async function getStandings(): Promise<StandingRow[]> {
  const [clubes, partidos] = await Promise.all([
    prisma.club.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.partido.findMany({
      where: { estado: "FINALIZADO", acta: { isNot: null } },
      select: {
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

    if (resultadoLocal > resultadoVisitante) {
      local.pg += 1;
      visitante.pp += 1;
    } else if (resultadoVisitante > resultadoLocal) {
      visitante.pg += 1;
      local.pp += 1;
    }
    // Empate: no debería pasar en básquetbol, pero si pasara no se suma PG/PP
    // de ningún lado — no se inventa un desempate.
  }

  for (const fila of filas.values()) {
    fila.dif = fila.pf - fila.pc;
    fila.pts = fila.pg * PUNTOS_VICTORIA + fila.pp * PUNTOS_DERROTA;
  }

  return [...filas.values()].sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.pf - a.pf);
}
