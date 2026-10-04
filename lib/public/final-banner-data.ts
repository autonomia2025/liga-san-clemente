import { prisma } from "@/lib/db";
import { clubNombreCorto } from "@/lib/public/display";
import { rondaDeJornada } from "@/lib/public/fase";

// Datos de la franja "La Final" que va debajo del navbar en las páginas
// públicas. Query propia y liviana (no getPlayoffsData): se carga en cada
// página y solo necesita el partido de la final por el título. La jornada se
// reconoce con rondaDeJornada, la misma regla del bracket, así que una "Final
// Copa de Plata" nunca se toma por la final.

export type FinalBannerData = {
  partidoId: string;
  local: string;
  visitante: string;
  fechaHora: string | null;
  cancha: string | null;
  estado: "PROGRAMADO" | "CONFIRMADO" | "EN_CURSO" | "FINALIZADO";
  // Solo con el partido FINALIZADO y acta sin empate.
  campeon: { nombre: string; rival: string; marcador: string } | null;
};

export async function getFinalBannerData(): Promise<FinalBannerData | null> {
  const jornadas = await prisma.jornada.findMany({
    where: { fase: "PLAYOFFS" },
    select: {
      nombre: true,
      fase: true,
      partidos: {
        select: {
          id: true,
          fechaHora: true,
          cancha: true,
          estado: true,
          clubLocal: { select: { nombre: true } },
          clubVisitante: { select: { nombre: true } },
          acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
        },
      },
    },
  });

  const partido = jornadas
    .filter((j) => rondaDeJornada(j.fase, j.nombre) === "final")
    .flatMap((j) => j.partidos)[0];
  if (!partido) return null;

  const local = clubNombreCorto(partido.clubLocal.nombre);
  const visitante = clubNombreCorto(partido.clubVisitante.nombre);

  let campeon: FinalBannerData["campeon"] = null;
  const acta = partido.acta;
  if (partido.estado === "FINALIZADO" && acta && acta.resultadoLocal !== acta.resultadoVisitante) {
    const ganaLocal = acta.resultadoLocal > acta.resultadoVisitante;
    campeon = {
      nombre: ganaLocal ? local : visitante,
      rival: ganaLocal ? visitante : local,
      marcador: `${Math.max(acta.resultadoLocal, acta.resultadoVisitante)}–${Math.min(acta.resultadoLocal, acta.resultadoVisitante)}`,
    };
  }

  return {
    partidoId: partido.id,
    local,
    visitante,
    fechaHora: partido.fechaHora ? partido.fechaHora.toISOString() : null,
    cancha: partido.cancha,
    estado: partido.estado,
    campeon,
  };
}
