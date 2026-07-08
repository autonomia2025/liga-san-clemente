import { getTopScorers } from "@/lib/public/rankings";

// Adapter para la página pública /goleadores. Reutiliza getTopScorers()
// (fuente híbrida real: JugadorPartidoStat + MatchEvent sin duplicar, ver
// rankings.ts) y solo agrega posición y slug de club, que getTopScorers() no
// necesita para sus otros consumidores (Home, /equipo/[slug]). No toca schema
// ni la lógica de ranking existente.

// Mismo slugify que ya usan home-live-data.ts y team-page-data.ts — se
// duplica localmente en vez de centralizarlo (convención ya establecida en
// este código: cada archivo de lib/public/ queda autocontenido).
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ScoringLeaderRow = {
  position: number;
  jugadorId: string;
  jugadorNombre: string;
  numeroCamiseta: number | null;
  clubId: string;
  clubNombre: string;
  clubSlug: string;
  partidosJugados: number;
  puntos: number;
  promedio: number;
};

export async function getScoringLeaders(limit = 100): Promise<ScoringLeaderRow[]> {
  const rows = await getTopScorers(limit);

  return rows.map((r, i) => ({
    position: i + 1,
    jugadorId: r.jugadorId,
    jugadorNombre: r.nombre,
    numeroCamiseta: r.numeroCamiseta,
    clubId: r.clubId,
    clubNombre: r.clubNombre,
    clubSlug: slugify(r.clubNombre),
    partidosJugados: r.partidosJugados,
    puntos: r.puntosTotal,
    promedio: r.promedio,
  }));
}
