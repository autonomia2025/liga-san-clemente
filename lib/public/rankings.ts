import { prisma } from "@/lib/db";
import { mergeScoringSources, type TopScorerRow } from "@/lib/public/scoring-merge";
import { wherePartidoJornadaFase, type FaseFiltro } from "@/lib/public/fase";

export type { TopScorerRow };

// Ranking de anotadores — fuente HÍBRIDA (PR Public Goleadores): junta
// JugadorPartidoStat (partidos ya consolidados) con MatchEvent tipo PUNTO de
// partidos que todavía no tienen stat consolidada, sin duplicar. La fusión en
// sí es pura y vive en lib/public/scoring-merge.ts (sin import de prisma, así
// se puede probar con datos sintéticos) — acá solo se arman las queries
// reales y se le pasan los resultados.
// `fase` va DESPUÉS de `limit` para no romper los llamadores existentes, que
// pasan limit posicional. El default es TOTAL (y no REGULAR como en la tabla)
// porque los puntos sí son aditivos entre fases: si la home dijera un número
// y /goleadores otro para el mismo jugador, sería peor que no tener el corte.
//
// INVARIANTE: las DOS queries se filtran con la misma fase. `partidosConStat`
// sale de los stats ya filtrados y el `notIn` se aplica sobre eventos también
// filtrados, así ningún partido se cuenta dos veces. Es exactamente la
// garantía que mergeScoringSources() documenta y asume; filtrar solo una de
// las dos la rompe en silencio.
export async function getTopScorers(limit = 10, fase: FaseFiltro = "TOTAL"): Promise<TopScorerRow[]> {
  const filtroFase = wherePartidoJornadaFase(fase);

  const stats = await prisma.jugadorPartidoStat.findMany({
    where: filtroFase,
    select: { partidoId: true, jugadorId: true, puntos: true },
  });

  const partidosConStat = new Set(stats.map((s) => s.partidoId));

  // Los MatchEvent de partidos que ya tienen JugadorPartidoStat se excluyen
  // acá, en la query — así mergeScoringSources() puede quedar puro y
  // confiado en que nunca ve un partido dos veces.
  const eventosPunto = await prisma.matchEvent.findMany({
    where: {
      tipo: "PUNTO",
      anulado: false,
      jugadorId: { not: null },
      partidoId: { notIn: [...partidosConStat] },
      ...filtroFase,
    },
    select: { partidoId: true, jugadorId: true, detalle: true },
  });

  const jugadorIds = [...new Set([...stats.map((s) => s.jugadorId), ...eventosPunto.map((e) => e.jugadorId!)])];
  if (jugadorIds.length === 0) return [];

  const jugadores = await prisma.jugador.findMany({
    where: { id: { in: jugadorIds } },
    select: { id: true, nombre: true, numeroCamiseta: true, clubId: true, club: { select: { nombre: true } } },
  });

  return mergeScoringSources(stats, eventosPunto, jugadores, limit);
}
