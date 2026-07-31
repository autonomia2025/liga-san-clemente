// Reprograma Fecha 6 y Fecha 7 (+7 días cada una, mismo orden/horarios) y
// limpia Fecha 4 a "sin fecha" (pendiente de confirmar). IDs exactos, sin
// filtros amplios. Dry-run por defecto; solo escribe con --confirm. Mismo
// patrón que reset-fecha3.ts.
//
// Fecha 7 se mueve también porque hoy ocupa el 9-ago con los mismos 4
// horarios que Fecha 6 — sin este corrimiento, Fecha 6 quedaría duplicada
// exactamente sobre Fecha 7 (mismo día, mismas horas). Se confirma correr
// todo el resto del fixture +7 días a partir de Fecha 6, manteniendo el
// intervalo semanal entre fechas.
import "dotenv/config";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");

// Fecha 6: hoy domingo 2-ago-2026, se corre 7 días -> domingo 9-ago-2026,
// mismos horarios y mismo orden de partidos. Jornada.fecha es "solo fecha"
// (medianoche UTC del mismo domingo del partido, ver lib/fecha.ts) — el
// literal de abajo son las 20:00 del sábado 8 en hora de Chile, que en UTC
// caen justo en la medianoche del domingo 9 (2026-08-09T00:00:00.000Z), el
// mismo patrón que ya tienen Fecha 2/3/5/7.
const JORNADA_6_ID = "cmr2s5h1o0004f5v44a6o3l73";
const NUEVA_FECHA_JORNADA_6 = new Date("2026-08-08T20:00:00-04:00");

const PARTIDOS_FECHA_6: { id: string; nuevaFechaHora: Date }[] = [
  { id: "cmr2s5q7v000tf5v4rap29zme", nuevaFechaHora: new Date("2026-08-09T15:00:00-04:00") }, // Alameda Linares vs JMM
  { id: "cmr2s5pp9000rf5v4dctml6in", nuevaFechaHora: new Date("2026-08-09T16:40:00-04:00") }, // C.D. Park vs Pumas
  { id: "cmr2s5pz2000sf5v46kstlibb", nuevaFechaHora: new Date("2026-08-09T18:20:00-04:00") }, // Las Américas vs Duao
  { id: "cmr2s5pet000qf5v4i0vdmc7h", nuevaFechaHora: new Date("2026-08-09T20:00:00-04:00") }, // UCM vs JMM U19
];

// Fecha 7: hoy domingo 9-ago-2026 (choca con la nueva Fecha 6), se corre 7
// días -> domingo 16-ago-2026, mismos horarios y mismo orden de partidos.
// Mismo criterio de Jornada.fecha que Fecha 6 arriba (20:00 sábado Chile ->
// medianoche UTC del domingo siguiente).
const JORNADA_7_ID = "cmr2s5hve0005f5v4j4qe3i83";
const NUEVA_FECHA_JORNADA_7 = new Date("2026-08-15T20:00:00-04:00");

const PARTIDOS_FECHA_7: { id: string; nuevaFechaHora: Date }[] = [
  { id: "cmr2s5qie000uf5v42902uyir", nuevaFechaHora: new Date("2026-08-16T15:00:00-04:00") }, // Las Américas vs JMM U19
  { id: "cmr2s5qqm000vf5v4qfniaq2p", nuevaFechaHora: new Date("2026-08-16T16:40:00-04:00") }, // Alameda Linares vs UCM
  { id: "cmr2s5r0y000wf5v4owp9rvv0", nuevaFechaHora: new Date("2026-08-16T18:20:00-04:00") }, // C.D. Park vs Duao
  { id: "cmr2s5rfn000xf5v492783b4l", nuevaFechaHora: new Date("2026-08-16T20:00:00-04:00") }, // Pumas vs CSDC JMM
];

// Fecha 4: sin fecha real confirmada todavía — se limpia a null en vez de
// inventar una fecha (Jornada.fecha y Partido.fechaHora de sus 4 partidos).
const JORNADA_4_ID = "cmr2s5fb30002f5v4brtxpmf7";
const PARTIDOS_FECHA_4_IDS = [
  "cmr2s5n62000if5v432xzevlz", // UCM vs Las Américas
  "cmr2s5ned000jf5v4m2z0m3wo", // JMM U19 vs Pumas
  "cmr2s5nwj000lf5v4j6tpjw1q", // C.D. Park vs Alameda Linares
  "cmr2s5noe000kf5v4f2gqkgh4", // CSDC JMM vs Duao
];

function fmt(d: Date | null): string {
  return d ? d.toISOString() : "(null)";
}

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN (sin --confirm, no se escribe nada) ===");

  const jornada6 = await prisma.jornada.findUnique({ where: { id: JORNADA_6_ID } });
  const jornada7 = await prisma.jornada.findUnique({ where: { id: JORNADA_7_ID } });
  const jornada4 = await prisma.jornada.findUnique({ where: { id: JORNADA_4_ID } });
  if (!jornada6 || jornada6.numero !== 6) throw new Error("Jornada 6 no coincide con el ID esperado — abortando.");
  if (!jornada7 || jornada7.numero !== 7) throw new Error("Jornada 7 no coincide con el ID esperado — abortando.");
  if (!jornada4 || jornada4.numero !== 4) throw new Error("Jornada 4 no coincide con el ID esperado — abortando.");

  console.log(`\nJornada 6.fecha: ${fmt(jornada6.fecha)} -> ${fmt(NUEVA_FECHA_JORNADA_6)}`);
  for (const p of PARTIDOS_FECHA_6) {
    const partido = await prisma.partido.findUnique({
      where: { id: p.id },
      include: { clubLocal: true, clubVisitante: true },
    });
    if (!partido || partido.jornadaId !== JORNADA_6_ID) {
      throw new Error(`Partido ${p.id} no pertenece a Jornada 6 — abortando por seguridad.`);
    }
    console.log(
      `  ${partido.clubLocal.nombre} vs ${partido.clubVisitante.nombre}: fechaHora ${fmt(partido.fechaHora)} -> ${fmt(p.nuevaFechaHora)}`,
    );
  }

  console.log(`\nJornada 7.fecha: ${fmt(jornada7.fecha)} -> ${fmt(NUEVA_FECHA_JORNADA_7)}`);
  for (const p of PARTIDOS_FECHA_7) {
    const partido = await prisma.partido.findUnique({
      where: { id: p.id },
      include: { clubLocal: true, clubVisitante: true },
    });
    if (!partido || partido.jornadaId !== JORNADA_7_ID) {
      throw new Error(`Partido ${p.id} no pertenece a Jornada 7 — abortando por seguridad.`);
    }
    console.log(
      `  ${partido.clubLocal.nombre} vs ${partido.clubVisitante.nombre}: fechaHora ${fmt(partido.fechaHora)} -> ${fmt(p.nuevaFechaHora)}`,
    );
  }

  console.log(`\nJornada 4.fecha: ${fmt(jornada4.fecha)} -> (null)`);
  for (const id of PARTIDOS_FECHA_4_IDS) {
    const partido = await prisma.partido.findUnique({
      where: { id },
      include: { clubLocal: true, clubVisitante: true },
    });
    if (!partido || partido.jornadaId !== JORNADA_4_ID) {
      throw new Error(`Partido ${id} no pertenece a Jornada 4 — abortando por seguridad.`);
    }
    if (partido.estado !== "PROGRAMADO") {
      throw new Error(`Partido ${id} no está PROGRAMADO (estado=${partido.estado}) — abortando por seguridad.`);
    }
    console.log(`  ${partido.clubLocal.nombre} vs ${partido.clubVisitante.nombre}: fechaHora ${fmt(partido.fechaHora)} -> (null)`);
  }

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction([
    prisma.jornada.update({ where: { id: JORNADA_6_ID }, data: { fecha: NUEVA_FECHA_JORNADA_6 } }),
    ...PARTIDOS_FECHA_6.map((p) =>
      prisma.partido.update({ where: { id: p.id }, data: { fechaHora: p.nuevaFechaHora } }),
    ),
    prisma.jornada.update({ where: { id: JORNADA_7_ID }, data: { fecha: NUEVA_FECHA_JORNADA_7 } }),
    ...PARTIDOS_FECHA_7.map((p) =>
      prisma.partido.update({ where: { id: p.id }, data: { fechaHora: p.nuevaFechaHora } }),
    ),
    prisma.jornada.update({ where: { id: JORNADA_4_ID }, data: { fecha: null } }),
    ...PARTIDOS_FECHA_4_IDS.map((id) => prisma.partido.update({ where: { id }, data: { fechaHora: null } })),
  ]);

  console.log("\nEscrito OK.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
