import { prisma } from "@/lib/db";

export type TopScorerRow = {
  jugadorId: string;
  nombre: string;
  numeroCamiseta: number | null;
  clubNombre: string;
  puntosTotal: number;
  partidosJugados: number;
  promedio: number;
};

// Ranking de anotadores desde JugadorPartidoStat — la misma tabla alimentada
// tanto por el histórico importado (origen=IMPORTADO) como por Mesa en vivo
// (origen=EVENTOS), así que un jugador con partidos de ambos orígenes suma
// correctamente sin duplicar ni distinguir fuente. No se calculan métricas
// que no existan en la data real (rebotes, asistencias, etc.).
export async function getTopScorers(limit = 10): Promise<TopScorerRow[]> {
  const stats = await prisma.jugadorPartidoStat.findMany({
    select: {
      puntos: true,
      jugador: { select: { id: true, nombre: true, numeroCamiseta: true } },
      club: { select: { nombre: true } },
    },
  });

  const porJugador = new Map<
    string,
    { nombre: string; numeroCamiseta: number | null; clubNombre: string; puntosTotal: number; partidosJugados: number }
  >();

  for (const s of stats) {
    const existente = porJugador.get(s.jugador.id);
    if (existente) {
      existente.puntosTotal += s.puntos;
      existente.partidosJugados += 1;
    } else {
      porJugador.set(s.jugador.id, {
        nombre: s.jugador.nombre,
        numeroCamiseta: s.jugador.numeroCamiseta,
        clubNombre: s.club.nombre,
        puntosTotal: s.puntos,
        partidosJugados: 1,
      });
    }
  }

  return [...porJugador.entries()]
    .map(([jugadorId, v]) => ({
      jugadorId,
      ...v,
      promedio: Math.round((v.puntosTotal / v.partidosJugados) * 10) / 10,
    }))
    .sort((a, b) => b.puntosTotal - a.puntosTotal)
    .slice(0, limit);
}
