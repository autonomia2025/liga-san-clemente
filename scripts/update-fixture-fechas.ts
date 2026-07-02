// Actualiza fecha/hora oficial de los partidos de Fecha 2 a Fecha 7 desde el
// fixture oficial nuevo ("data/private/Fixture Final LBSC (1).xlsx").
//
// Fecha 1 se ignora explícitamente: ya está jugada, finalizada, con Acta y
// estadísticas históricas — no se toca acá bajo ninguna circunstancia.
//
// Solo actualiza Partido.fechaHora y Jornada.fecha. No crea partidos, no
// crea jornadas, no toca estado, no toca resultados/Actas/stats/eventos.
// Si un cruce (local/visitante) del Excel no matchea ningún Partido
// existente, se reporta como error y esa fila se omite — no se crea nada
// nuevo ni se fuerza un match distinto.
//
// Hora del fixture interpretada como hora de Chile (America/Santiago). Las
// fechas del fixture (jul-ago 2026) caen en horario estándar chileno
// (UTC-4, sin cambio de horario de verano vigente en esas fechas), así que
// se usa el offset fijo -04:00 sin depender de una zona horaria del sistema.
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";

const EXCEL_PATH = path.join(process.cwd(), "data/private/Fixture Final LBSC (1).xlsx");
const REPORT_DIR = path.join(process.cwd(), "data/private");
const SHEET_NAME = "Fixture";
const CHILE_OFFSET = "-04:00";

// Mismo mapeo usado en scripts/import-fixture.ts — el Excel usa nombres
// cortos, la base usa el nombre oficial completo del registro de clubes.
const CLUB_NAME_MAP: Record<string, string> = {
  "Club Deportivo Park": "C.D. PARK",
  "JMM Adulto": "CSDC JORGE MENESES MATURANA",
  "JMM Juvenil": "JMM U19",
  "Duao Basketball": "CLUB DEPORTIVO BASKETBALL DUAO",
  "Pumas San Clemente": "PUMAS",
  "Club Deportivo UCM": "CLUB UNIVERSIDAD CATÓLICA DEL MAULE",
  "Las Américas": "LAS AMERICAS",
  "Alameda Linares": "CLUB DE BASQUETBOL ALAMEDA LINARES",
};

const MESES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

type Row = (string | number | null)[];

type FilaFixture = {
  fila: number;
  jornadaNumero: number;
  diaTexto: string;
  hora: string;
  localExcel: string;
  visitanteExcel: string;
};

function norm(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// "Dom 05-jul-2026" -> { day: 5, month: 7, year: 2026 }
function parseFecha(diaTexto: string): { day: number; month: number; year: number } | null {
  const m = diaTexto.match(/(\d{2})-([a-záéíóú]{3})-(\d{4})/i);
  if (!m) return null;
  const day = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (!mes) return null;
  return { day, month: mes, year };
}

function buildFechaHora(diaTexto: string, hora: string): Date | null {
  const fecha = parseFecha(diaTexto);
  if (!fecha) return null;
  const horaMatch = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!horaMatch) return null;
  const iso = `${fecha.year}-${String(fecha.month).padStart(2, "0")}-${String(fecha.day).padStart(2, "0")}T${horaMatch[1].padStart(2, "0")}:${horaMatch[2]}:00${CHILE_OFFSET}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildFechaSolo(diaTexto: string): Date | null {
  const fecha = parseFecha(diaTexto);
  if (!fecha) return null;
  return new Date(Date.UTC(fecha.year, fecha.month - 1, fecha.day));
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`No se encontró el archivo en: ${EXCEL_PATH}`);
    process.exitCode = 1;
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const ws = workbook.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`No se encontró la hoja "${SHEET_NAME}" en el Excel.`);
    process.exitCode = 1;
    return;
  }
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });

  const headerRowIdx = rows.findIndex(
    (r) => r?.[0] === "Fecha" && r?.[3] === "Local" && r?.[5] === "Visita",
  );
  if (headerRowIdx === -1) {
    console.error('No se encontró el encabezado ("Fecha", "Local", "Visita") en la hoja.');
    process.exitCode = 1;
    return;
  }

  const filas: FilaFixture[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const fechaCol = norm(row[0] as string); // "Fecha 1".."Fecha 7"
    const dia = norm(row[1] as string);
    const hora = norm(row[2] as string);
    const local = norm(row[3] as string);
    const visita = norm(row[5] as string);

    if (!fechaCol || !dia || !hora || !local || !visita) continue;

    const jornadaMatch = fechaCol.match(/^Fecha (\d+)$/);
    if (!jornadaMatch) continue;
    const jornadaNumero = Number(jornadaMatch[1]);

    // Fecha 1 se ignora explícitamente acá, antes de tocar nada.
    if (jornadaNumero === 1) continue;

    filas.push({
      fila: r + 1,
      jornadaNumero,
      diaTexto: dia,
      hora,
      localExcel: local,
      visitanteExcel: visita,
    });
  }

  const report: string[] = [];
  report.push(`Actualización de fechas/horarios de fixture (Fecha 2-7) — ${new Date().toISOString()}`);
  report.push("=".repeat(70));
  report.push(`Filas leídas del Excel (excluyendo Fecha 1): ${filas.length}`);

  const clubCache = new Map<string, { id: string; nombre: string } | null>();
  async function resolveClub(nombreExcel: string) {
    if (clubCache.has(nombreExcel)) return clubCache.get(nombreExcel) ?? null;
    const nombreOficial = CLUB_NAME_MAP[nombreExcel];
    if (!nombreOficial) {
      clubCache.set(nombreExcel, null);
      return null;
    }
    const club = await prisma.club.findUnique({ where: { nombre: nombreOficial } });
    clubCache.set(nombreExcel, club);
    return club;
  }

  const errores: string[] = [];
  let partidosActualizados = 0;
  let partidosYaAlDia = 0;
  const jornadasFechaNueva = new Map<number, Date>();

  for (const f of filas) {
    const clubLocal = await resolveClub(f.localExcel);
    const clubVisitante = await resolveClub(f.visitanteExcel);
    if (!clubLocal || !clubVisitante) {
      const cual = !clubLocal ? f.localExcel : f.visitanteExcel;
      errores.push(
        `Fila ${f.fila} (Fecha ${f.jornadaNumero}): club "${cual}" no matchea ningún club existente — omitida.`,
      );
      continue;
    }

    const fechaHora = buildFechaHora(f.diaTexto, f.hora);
    if (!fechaHora) {
      errores.push(`Fila ${f.fila}: no se pudo parsear fecha/hora ("${f.diaTexto}" "${f.hora}") — omitida.`);
      continue;
    }

    const jornada = await prisma.jornada.findUnique({ where: { numero: f.jornadaNumero } });
    if (!jornada) {
      errores.push(`Fila ${f.fila}: Jornada ${f.jornadaNumero} no existe en la base — omitida.`);
      continue;
    }

    const partido = await prisma.partido.findFirst({
      where: { jornadaId: jornada.id, clubLocalId: clubLocal.id, clubVisitanteId: clubVisitante.id },
    });
    if (!partido) {
      errores.push(
        `Fila ${f.fila}: no existe Partido J${f.jornadaNumero} ${clubLocal.nombre} vs ${clubVisitante.nombre} en la base — omitida (no se crea).`,
      );
      continue;
    }
    if (partido.estado === "FINALIZADO") {
      errores.push(
        `Fila ${f.fila}: Partido ${partido.id} (J${f.jornadaNumero}) ya está FINALIZADO — no se toca por seguridad.`,
      );
      continue;
    }

    if (partido.fechaHora && partido.fechaHora.getTime() === fechaHora.getTime()) {
      partidosYaAlDia++;
      report.push(
        `  [OK] Fila ${f.fila}: J${f.jornadaNumero} ${clubLocal.nombre} vs ${clubVisitante.nombre} — ya tenía la fecha correcta.`,
      );
    } else {
      await prisma.partido.update({ where: { id: partido.id }, data: { fechaHora } });
      partidosActualizados++;
      report.push(
        `  [OK] Fila ${f.fila}: J${f.jornadaNumero} ${clubLocal.nombre} vs ${clubVisitante.nombre} — fechaHora actualizada a ${fechaHora.toISOString()}.`,
      );
    }

    const fechaSolo = buildFechaSolo(f.diaTexto);
    if (fechaSolo) jornadasFechaNueva.set(f.jornadaNumero, fechaSolo);
  }

  let jornadasActualizadas = 0;
  let jornadasYaAlDia = 0;
  for (const [numero, fecha] of jornadasFechaNueva) {
    const jornada = await prisma.jornada.findUnique({ where: { numero } });
    if (!jornada) continue;
    if (jornada.fecha && jornada.fecha.getTime() === fecha.getTime()) {
      jornadasYaAlDia++;
      continue;
    }
    await prisma.jornada.update({ where: { id: jornada.id }, data: { fecha } });
    jornadasActualizadas++;
  }

  report.push("\n" + "=".repeat(70));
  report.push("RESUMEN");
  report.push(`Partidos actualizados: ${partidosActualizados}`);
  report.push(`Partidos ya al día: ${partidosYaAlDia}`);
  report.push(`Jornadas actualizadas: ${jornadasActualizadas}`);
  report.push(`Jornadas ya al día: ${jornadasYaAlDia}`);
  report.push(`Errores/omisiones: ${errores.length}`);
  if (errores.length > 0) {
    report.push("\nERRORES/OMISIONES:");
    for (const e of errores) report.push(`  ${e}`);
  }

  const reportPath = path.join(
    REPORT_DIR,
    `update-report-fixture-fechas-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );
  fs.writeFileSync(reportPath, report.join("\n"), "utf-8");

  console.log(`Partidos actualizados: ${partidosActualizados}`);
  console.log(`Partidos ya al día: ${partidosYaAlDia}`);
  console.log(`Jornadas actualizadas: ${jornadasActualizadas}`);
  console.log(`Jornadas ya al día: ${jornadasYaAlDia}`);
  console.log(`Errores/omisiones: ${errores.length}`);
  if (errores.length > 0) {
    console.log("\nErrores/omisiones:");
    for (const e of errores) console.log(`  ${e}`);
  }
  console.log(`\nReporte completo guardado en: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("Error al actualizar fechas del fixture:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
