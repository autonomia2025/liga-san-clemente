// Pasa los 4 partidos de Cuartos de Final de PROGRAMADO a CONFIRMADO — el
// paso que le falta a Mesa para poder abrirlos. abrirPartido() (app/mesa/
// actions.ts) rechaza explícitamente un partido en PROGRAMADO ("El partido
// debe estar confirmado por el Admin antes de abrirse"), así que sin esto
// la Mesa no puede darles play aunque los partidos ya existan.
//
// Mismas validaciones que confirmarPartido() (app/admin/partidos/[id]/
// actions.ts), la acción real de Admin para esto — no se bypassea ninguna
// regla, solo se automatizan los 4 clicks de "Confirmar partido para Mesa".
//
// Escribe con SQL crudo (no el cliente de Prisma) por la misma razón que el
// resto de los scripts de esta sesión: el cliente generado en este entorno
// no conoce Jornada.fase y el CLI de prisma se cuelga acá.
//
// Dry-run por defecto; solo escribe con --confirm.
import "dotenv/config";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");

const PARTIDOS = [
  "c031138f572739232521565a0", // C.D. Park vs UCM, 15:00
  "c72e28c3d2e14aa25dd3ddda3", // Pumas vs Alameda Linares, 16:40
  "cde622d8dbfea01d2c9a2674e", // Las Américas vs Duao, 18:20
  "c23c6b3714897d2ff9ac9e922", // CSDC JMM vs JMM U19, 20:00
];

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN (sin --confirm, no se escribe nada) ===");

  for (const id of PARTIDOS) {
    const p = await prisma.$queryRawUnsafe<any[]>(
      `SELECT p.id, p.estado::text AS estado, j.numero AS jornada,
              cl.nombre AS local, cv.nombre AS visitante,
              (SELECT COUNT(*)::int FROM jugadores WHERE "clubId" = p."clubLocalId" AND activo = true) AS local_jugadores,
              (SELECT COUNT(*)::int FROM jugadores WHERE "clubId" = p."clubVisitanteId" AND activo = true) AS visitante_jugadores
       FROM partidos p
       JOIN jornadas j ON j.id = p."jornadaId"
       JOIN clubes cl ON cl.id = p."clubLocalId"
       JOIN clubes cv ON cv.id = p."clubVisitanteId"
       WHERE p.id = $1`,
      id,
    );
    if (p.length === 0) throw new Error(`Partido ${id} no existe — abortando.`);
    const partido = p[0];

    if (partido.jornada !== 8) throw new Error(`Partido ${id} no es de Jornada 8 — abortando.`);
    if (partido.estado === "FINALIZADO") throw new Error(`Partido ${id} ya está finalizado — abortando.`);
    if (partido.estado !== "PROGRAMADO") throw new Error(`Partido ${id} ya no está en PROGRAMADO (está en ${partido.estado}) — abortando.`);
    if (partido.local_jugadores === 0) throw new Error(`${partido.local} no tiene jugadores — abortando.`);
    if (partido.visitante_jugadores === 0) throw new Error(`${partido.visitante} no tiene jugadores — abortando.`);

    console.log(`  OK  ${partido.local} vs ${partido.visitante}: PROGRAMADO -> CONFIRMADO`);
  }

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  for (const id of PARTIDOS) {
    await prisma.$executeRawUnsafe(
      `UPDATE partidos SET estado = 'CONFIRMADO' WHERE id = $1 AND estado = 'PROGRAMADO'`,
      id,
    );
  }

  const verif = await prisma.$queryRawUnsafe<any[]>(`
    SELECT cl.nombre AS local, cv.nombre AS visitante, p.estado::text AS estado
    FROM partidos p
    JOIN clubes cl ON cl.id = p."clubLocalId"
    JOIN clubes cv ON cv.id = p."clubVisitanteId"
    WHERE p.id = ANY($1::text[]) ORDER BY p."fechaHora"
  `, PARTIDOS);
  console.log("\nEscrito OK. Estado final:");
  for (const v of verif) console.log(`  ${v.local} vs ${v.visitante}: ${v.estado}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exitCode = 1;
});
