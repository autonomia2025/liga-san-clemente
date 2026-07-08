// Fusión pura de las dos fuentes de goleadores — sin import de prisma/DB a
// propósito, para poder probarla con datos sintéticos sin necesitar
// DATABASE_URL (ver auditoría de la PR Public Goleadores). getTopScorers()
// en rankings.ts hace las queries reales y le pasa los resultados acá.
//
//   1. JugadorPartidoStat: partidos ya consolidados, sea por import histórico
//      (origen=IMPORTADO, sin timeline — nunca tuvieron ni tendrán MatchEvent)
//      o por Mesa tras generar el Acta (origen=EVENTOS, generarActa en
//      app/mesa/partidos/[id]/actions.ts crea estas filas al finalizar).
//   2. MatchEvent tipo PUNTO no anulado: partidos operados por Mesa que
//      TODAVÍA no tienen JugadorPartidoStat — o sea, EN_CURSO, o FINALIZADOS
//      pero sin Acta generada todavía. En cuanto Mesa genera el Acta de ese
//      partido, sus MatchEvent dejan de sumarse acá (ya está en (1)) y el
//      ranking sigue igual, solo que ahora lee la fuente consolidada en vez
//      de recalcular en vivo.
//
// Anti-duplicado: `eventosPunto` debe venir YA filtrado (por el llamador, vía
// `notIn` en la query) para excluir cualquier partidoId que aparezca en
// `stats` — esta función no vuelve a filtrar, así que es responsabilidad de
// getTopScorers() pasarle los datos correctos.
//
// Club mostrado: el club ACTUAL del jugador (Jugador.club), no "el club de la
// estadística más reciente" — el modelo no tiene historial de traspasos
// (Jugador.clubId es un solo valor), y derivar "más reciente" cruzando fecha
// de partido (nullable) agregaría complejidad y ambigüedad sin una garantía
// real de exactitud. Ver auditoría de la PR para el detalle de esta decisión.

export type TopScorerRow = {
  jugadorId: string;
  nombre: string;
  numeroCamiseta: number | null;
  clubId: string;
  clubNombre: string;
  puntosTotal: number;
  partidosJugados: number;
  promedio: number;
};

export type StatRow = { partidoId: string; jugadorId: string; puntos: number };
export type EventoPuntoRow = { partidoId: string; jugadorId: string | null; detalle: unknown };
export type JugadorInfo = {
  id: string;
  nombre: string;
  numeroCamiseta: number | null;
  clubId: string;
  club: { nombre: string };
};

function extraerValorPunto(detalle: unknown): number {
  if (detalle && typeof detalle === "object" && !Array.isArray(detalle) && "valor" in detalle) {
    const v = (detalle as { valor: unknown }).valor;
    return typeof v === "number" ? v : 0;
  }
  return 0;
}

export function mergeScoringSources(
  stats: StatRow[],
  eventosPunto: EventoPuntoRow[],
  jugadores: JugadorInfo[],
  limit: number,
): TopScorerRow[] {
  const puntosPorJugador = new Map<string, number>();
  const partidosPorJugador = new Map<string, Set<string>>();

  const acumular = (jugadorId: string, partidoId: string, puntos: number) => {
    puntosPorJugador.set(jugadorId, (puntosPorJugador.get(jugadorId) ?? 0) + puntos);
    const partidos = partidosPorJugador.get(jugadorId) ?? new Set<string>();
    partidos.add(partidoId);
    partidosPorJugador.set(jugadorId, partidos);
  };

  for (const s of stats) acumular(s.jugadorId, s.partidoId, s.puntos);
  for (const e of eventosPunto) {
    if (!e.jugadorId) continue;
    acumular(e.jugadorId, e.partidoId, extraerValorPunto(e.detalle));
  }

  const infoPorJugador = new Map(jugadores.map((j) => [j.id, j]));
  const jugadorIds = [...puntosPorJugador.keys()];

  return jugadorIds
    .map((jugadorId) => {
      const info = infoPorJugador.get(jugadorId);
      const puntosTotal = puntosPorJugador.get(jugadorId) ?? 0;
      const partidosJugados = partidosPorJugador.get(jugadorId)?.size ?? 0;
      return {
        jugadorId,
        nombre: info?.nombre ?? "Jugador",
        numeroCamiseta: info?.numeroCamiseta ?? null,
        clubId: info?.clubId ?? "",
        clubNombre: info?.club.nombre ?? "—",
        puntosTotal,
        partidosJugados,
        promedio: partidosJugados > 0 ? Math.round((puntosTotal / partidosJugados) * 10) / 10 : 0,
      };
    })
    .sort(
      (a, b) =>
        b.puntosTotal - a.puntosTotal || b.promedio - a.promedio || a.nombre.localeCompare(b.nombre),
    )
    .slice(0, limit);
}
