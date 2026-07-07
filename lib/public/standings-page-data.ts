import { prisma } from "@/lib/db";
import { getStandings } from "@/lib/public/standings";
import { clubLogoUrl } from "@/lib/public/display";

// Adapter para la página /tabla completa. Reutiliza getStandings() (fuente de
// verdad: Partido FINALIZADO + Acta, nunca datos inventados) y solo agrega el
// escudo de cada club, que getStandings() no necesita para la Home. No toca
// schema ni la lógica de standings existente.
export type StandingsPageRow = {
  position: number;
  clubId: string;
  clubNombre: string;
  escudoUrl?: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number;
  pc: number;
  dif: number;
  pts: number;
};

export async function getStandingsPageData(): Promise<StandingsPageRow[]> {
  const [rows, clubes] = await Promise.all([
    getStandings(),
    prisma.club.findMany({ select: { id: true, escudoUrl: true } }),
  ]);
  const escudoPorClub = new Map(clubes.map((c) => [c.id, c.escudoUrl]));

  return rows.map((r, i) => ({
    position: i + 1,
    clubId: r.clubId,
    clubNombre: r.clubNombre,
    escudoUrl: clubLogoUrl(r.clubNombre) ?? escudoPorClub.get(r.clubId) ?? undefined,
    pj: r.pj,
    pg: r.pg,
    pp: r.pp,
    pf: r.pf,
    pc: r.pc,
    dif: r.dif,
    pts: r.pts,
  }));
}
