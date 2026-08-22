// Reanuda el partido DUAO vs UCM (Fecha 5, id cmr2s5ow6000of5v4gd57i310), que
// quedo cerrado por error: Q4 se abrio y cerro en 1.96 segundos sin ninguna
// jugada (INICIO_CUARTO 00:11:25.774Z -> FIN_CUARTO 00:11:27.733Z), lo que
// dejo pasar el guard de finalizarPartido (solo exige que exista el
// FIN_CUARTO del ultimo cuarto y que no este empatado, no exige tiempo
// jugado). Ver auditoria completa en la conversacion.
//
// Operacion: exactamente 2 UPDATE, 0 DELETE, 0 INSERT.
//   1) Partido.estado: FINALIZADO -> EN_CURSO (cuartoActual/reloj/mesaOperadorId
//      NO se tocan, ya estan en el valor correcto para reanudar Q4 limpio).
//   2) MatchEvent (el FIN_CUARTO fantasma de Q4): anulado=true. Se anula, no
//      se borra, mismo mecanismo que ya usa Mesa en deshacerUltimoEvento
//      para este mismo caso (ver app/mesa/partidos/[id]/actions.ts:762-793).
//
// Con esto, lib/mesa/live-match-state.ts::calcularEstadoCuartos vuelve a
// calcular cuartoActivo=4 (el INICIO_CUARTO de Q4 sigue vigente, sin su
// cierre) y Mesa muestra "Q4 en curso", habilitando registrarPunto/
// registrarFalta/etc. normalmente. Acta y JugadorPartidoStat NO se tocan:
// quedan con el snapshot de fin de Q3 (47-39) hasta que se vuelva a jugar Q4
// de verdad y se corra generarActa otra vez (es idempotente, upsert).
//
// Dry-run por defecto; solo escribe con --confirm. Guards exactos: aborta si
// cualquier campo relevante cambio desde la auditoria.
import "dotenv/config";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");

const PARTIDO_ID = "cmr2s5ow6000of5v4gd57i310";
const EVENTO_FANTASMA_ID = "cms2h1unp000704l7q123wet8";
const ANULADO_POR_ID = "usr_mesa_1";

const GUARDS_ESPERADOS = {
  partidoEstado: "FINALIZADO",
  partidoUpdatedAt: "2026-07-27T00:11:30.024Z",
  eventosTotal: 97,
  eventosVigentes: 96,
  eventoFantasmaTipo: "FIN_CUARTO",
  eventoFantasmaCuarto: 4,
  eventoFantasmaAnulado: false,
  jugadorPartidoStatCount: 23,
  partidoJugadorCount: 23,
  actaGeneradaAt: "2026-07-27T00:11:31.933Z",
  actaResultadoLocal: 47,
  actaResultadoVisitante: 39,
} as const;

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN / GUARDS (sin --confirm, no se escribe nada) ===");

  const partido = await prisma.partido.findUnique({ where: { id: PARTIDO_ID } });
  if (!partido) throw new Error(`Partido ${PARTIDO_ID} no existe — abortando.`);

  const evento = await prisma.matchEvent.findUnique({ where: { id: EVENTO_FANTASMA_ID } });
  if (!evento) throw new Error(`Evento ${EVENTO_FANTASMA_ID} no existe — abortando.`);
  if (evento.partidoId !== PARTIDO_ID) throw new Error("El evento no pertenece a este partido — abortando.");

  const [eventosTotal, eventosVigentes, statsCount, rosterCount, acta] = await Promise.all([
    prisma.matchEvent.count({ where: { partidoId: PARTIDO_ID } }),
    prisma.matchEvent.count({ where: { partidoId: PARTIDO_ID, anulado: false } }),
    prisma.jugadorPartidoStat.count({ where: { partidoId: PARTIDO_ID } }),
    prisma.partidoJugador.count({ where: { partidoId: PARTIDO_ID } }),
    prisma.acta.findUnique({ where: { partidoId: PARTIDO_ID } }),
  ]);

  const checks: { nombre: string; ok: boolean; esperado: unknown; actual: unknown }[] = [
    { nombre: "partido.estado", ok: partido.estado === GUARDS_ESPERADOS.partidoEstado, esperado: GUARDS_ESPERADOS.partidoEstado, actual: partido.estado },
    { nombre: "partido.updatedAt", ok: partido.updatedAt.toISOString() === GUARDS_ESPERADOS.partidoUpdatedAt, esperado: GUARDS_ESPERADOS.partidoUpdatedAt, actual: partido.updatedAt.toISOString() },
    { nombre: "eventosTotal", ok: eventosTotal === GUARDS_ESPERADOS.eventosTotal, esperado: GUARDS_ESPERADOS.eventosTotal, actual: eventosTotal },
    { nombre: "eventosVigentes", ok: eventosVigentes === GUARDS_ESPERADOS.eventosVigentes, esperado: GUARDS_ESPERADOS.eventosVigentes, actual: eventosVigentes },
    { nombre: "evento.tipo", ok: evento.tipo === GUARDS_ESPERADOS.eventoFantasmaTipo, esperado: GUARDS_ESPERADOS.eventoFantasmaTipo, actual: evento.tipo },
    { nombre: "evento.cuarto", ok: evento.cuarto === GUARDS_ESPERADOS.eventoFantasmaCuarto, esperado: GUARDS_ESPERADOS.eventoFantasmaCuarto, actual: evento.cuarto },
    { nombre: "evento.anulado", ok: evento.anulado === GUARDS_ESPERADOS.eventoFantasmaAnulado, esperado: GUARDS_ESPERADOS.eventoFantasmaAnulado, actual: evento.anulado },
    { nombre: "jugadorPartidoStat.count", ok: statsCount === GUARDS_ESPERADOS.jugadorPartidoStatCount, esperado: GUARDS_ESPERADOS.jugadorPartidoStatCount, actual: statsCount },
    { nombre: "partidoJugador.count", ok: rosterCount === GUARDS_ESPERADOS.partidoJugadorCount, esperado: GUARDS_ESPERADOS.partidoJugadorCount, actual: rosterCount },
    { nombre: "acta.generadaAt", ok: (acta?.generadaAt.toISOString() ?? null) === GUARDS_ESPERADOS.actaGeneradaAt, esperado: GUARDS_ESPERADOS.actaGeneradaAt, actual: acta?.generadaAt.toISOString() ?? null },
    { nombre: "acta.resultadoLocal", ok: acta?.resultadoLocal === GUARDS_ESPERADOS.actaResultadoLocal, esperado: GUARDS_ESPERADOS.actaResultadoLocal, actual: acta?.resultadoLocal ?? null },
    { nombre: "acta.resultadoVisitante", ok: acta?.resultadoVisitante === GUARDS_ESPERADOS.actaResultadoVisitante, esperado: GUARDS_ESPERADOS.actaResultadoVisitante, actual: acta?.resultadoVisitante ?? null },
  ];

  console.log("\nGUARDS:");
  let todosOk = true;
  for (const c of checks) {
    const marca = c.ok ? "OK  " : "FAIL";
    if (!c.ok) todosOk = false;
    console.log(`  [${marca}] ${c.nombre}: esperado=${JSON.stringify(c.esperado)} actual=${JSON.stringify(c.actual)}`);
  }

  // Verificacion adicional: usr_mesa_1 debe ser el mesaOperadorId actual del
  // partido (no se reasigna nada, solo se confirma que anuladoPorId
  // corresponde al operador ya asignado).
  const operadorCoincide = partido.mesaOperadorId === ANULADO_POR_ID;
  console.log(`  [${operadorCoincide ? "OK  " : "FAIL"}] mesaOperadorId actual coincide con anuladoPorId propuesto: esperado=${ANULADO_POR_ID} actual=${partido.mesaOperadorId}`);
  if (!operadorCoincide) todosOk = false;

  const usuario = await prisma.usuario.findUnique({ where: { id: ANULADO_POR_ID } });
  const usuarioValido = usuario !== null && usuario.rol === "MESA" && usuario.activo;
  console.log(`  [${usuarioValido ? "OK  " : "FAIL"}] usuario ${ANULADO_POR_ID} existe, rol=MESA, activo=true: actual=${JSON.stringify(usuario)}`);
  if (!usuarioValido) todosOk = false;

  console.log(`\n${todosOk ? "TODOS LOS GUARDS PASARON." : "ALGUN GUARD FALLO — ABORTANDO, NO SE ESCRIBE NADA."}`);

  if (!todosOk) {
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log("\nCAMBIOS A APLICAR:");
  console.log(`  Partido.estado: FINALIZADO -> EN_CURSO`);
  console.log(`  MatchEvent(${EVENTO_FANTASMA_ID}).anulado: false -> true (anuladoPorId=${ANULADO_POR_ID}, anuladoAt=now())`);
  console.log(`  (cuartoActual, relojEstado, relojRestanteSegundos, relojUltimoInicio, mesaOperadorId: sin cambios)`);

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const partidoUpdate = await tx.partido.updateMany({
      where: { id: PARTIDO_ID, estado: "FINALIZADO" },
      data: { estado: "EN_CURSO" },
    });
    if (partidoUpdate.count !== 1) {
      throw new Error("El partido ya no estaba FINALIZADO al momento de escribir — abortando transaccion.");
    }

    const eventoUpdate = await tx.matchEvent.updateMany({
      where: { id: EVENTO_FANTASMA_ID, anulado: false },
      data: { anulado: true, anuladoPorId: ANULADO_POR_ID, anuladoAt: new Date() },
    });
    if (eventoUpdate.count !== 1) {
      throw new Error("El evento ya no estaba vigente al momento de escribir — abortando transaccion.");
    }

    return { partidoUpdate, eventoUpdate };
  });

  console.log("\nEscrito OK.", JSON.stringify(resultado));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
