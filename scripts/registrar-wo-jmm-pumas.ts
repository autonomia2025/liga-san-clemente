// Registra el partido JMM U19 vs Pumas (Fecha 4, id cmr2s5ned000jf5v4m2z0m3wo)
// como W.O.: JMM U19 no pudo presentarse, Pumas gana 20-0. No es un cierre de
// Mesa (no hubo cuartos jugados) -- no se fabrican MatchEvent/JugadorPartidoStat
// falsos, mismo criterio que los partidos importados de Fecha 1/2 (sin
// timeline). Solo Partido.estado + una Acta nueva.
//
// Dry-run por defecto; solo escribe con --confirm. Guards: aborta si el
// partido ya no esta PROGRAMADO, si ya tiene Acta, o si dejo de ser el unico
// PROGRAMADO (evita pisar el partido equivocado si algo cambio).
import "dotenv/config";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");
const PARTIDO_ID = "cmr2s5ned000jf5v4m2z0m3wo";
const RESULTADO_LOCAL = 0; // JMM U19
const RESULTADO_VISITANTE = 20; // PUMAS
const OBSERVACIONES = "Victoria por W.O. — Pumas gana por incomparecencia de JMM U19.";

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN (sin --confirm, no se escribe nada) ===");

  const partido = await prisma.partido.findUnique({
    where: { id: PARTIDO_ID },
    include: { clubLocal: true, clubVisitante: true, acta: true, jornada: { select: { numero: true } } },
  });
  if (!partido) throw new Error("Partido no existe — abortando.");
  if (partido.jornada.numero !== 4) throw new Error("El partido no es de Fecha 4 — abortando.");
  if (partido.clubLocal.nombre !== "JMM U19" || partido.clubVisitante.nombre !== "PUMAS") {
    throw new Error("Los equipos no coinciden con JMM U19 (local) vs PUMAS (visitante) — abortando.");
  }
  if (partido.estado !== "PROGRAMADO") throw new Error(`El partido ya no esta PROGRAMADO (estado=${partido.estado}) — abortando.`);
  if (partido.acta) throw new Error("El partido ya tiene Acta — abortando para no pisarla.");

  const eventosCount = await prisma.matchEvent.count({ where: { partidoId: PARTIDO_ID } });
  const statsCount = await prisma.jugadorPartidoStat.count({ where: { partidoId: PARTIDO_ID } });
  if (eventosCount > 0 || statsCount > 0) throw new Error("El partido ya tiene eventos o stats — abortando.");

  console.log(`\nPartido: ${partido.clubLocal.nombre} (local) vs ${partido.clubVisitante.nombre} (visitante), Fecha 4`);
  console.log(`  estado: PROGRAMADO -> FINALIZADO`);
  console.log(`  Acta (nueva): resultadoLocal=${RESULTADO_LOCAL} resultadoVisitante=${RESULTADO_VISITANTE}`);
  console.log(`  observacionesMesa: "${OBSERVACIONES}"`);
  console.log(`  (MatchEvent, JugadorPartidoStat, PartidoJugador: sin cambios — 0 en los 3, no se fabrica nada)`);

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    const partidoUpdate = await tx.partido.updateMany({
      where: { id: PARTIDO_ID, estado: "PROGRAMADO" },
      data: { estado: "FINALIZADO" },
    });
    if (partidoUpdate.count !== 1) throw new Error("El partido cambio de estado justo antes de escribir — abortando transaccion.");

    await tx.acta.create({
      data: {
        partidoId: PARTIDO_ID,
        resultadoLocal: RESULTADO_LOCAL,
        resultadoVisitante: RESULTADO_VISITANTE,
        observacionesMesa: OBSERVACIONES,
      },
    });
  });

  console.log("\nEscrito OK.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
