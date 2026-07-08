import { prisma } from "@/lib/db";
import { mergeScoringSources, type TopScorerRow } from "@/lib/public/scoring-merge";

export type { TopScorerRow };

// Ranking de anotadores — fuente HÍBRIDA (PR Public Goleadores): junta
// JugadorPartidoStat (partidos ya consolidados) con MatchEvent tipo PUNTO de
// partidos que todavía no tienen stat consolidada, sin duplicar. La fusión en
// sí es pura y vive en lib/public/scoring-merge.ts (sin import de prisma, así
// se puede probar con datos sintéticos) — acá solo se arman las queries
// reales y se le pasan los resultados.
export async function getTopScorers(limit = 10): Promise<TopScorerRow[]> {
  const stats = await prisma.jugadorPartidoStat.findMany({
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
