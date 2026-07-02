// Importa el fixture de fase regular (jornadas + partidos) desde el Excel
// real de estadísticas ("data/private/Estadisticas_Liga_San_Clemente_CLAUDE.xlsx").
//
// Ese archivo no se sube al repo (data/private/ y *.xlsx están en
// .gitignore). Este script solo corre localmente/manual.
//
// Alcance: solo fase "Regular" con local/visitante definidos (28 partidos,
// 7 jornadas). Los slots de Playoff no tienen equipos asignados todavía en
// el Excel y no se importan — no hay que inventar emparejamientos.
//
// Seguro de correr más de una vez: jornadas se upsertean por número,
// partidos por (jornadaId, clubLocalId, clubVisitanteId).
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data/private/Estadisticas_Liga_San_Clemente_CLAUDE.xlsx",
);
const REPORT_DIR = path.join(process.cwd(), "data/private");
const SHEET_NAME = "🏀 PARTIDOS";

// Mapeo de nombres de club entre el Excel de estadísticas y el registro
// oficial ya importado (PR 1.1). Validado cruzando jugadores en ambos
// archivos — 100% de coincidencia por club.
const CLUB_NAME_MAP: Record<string, string> = {
  "Club Deportivo Park": "C.D. PARK",
  "JMM Adulto": "CSDC JORGE MENESES MATURANA",
  "Las Américas": "LAS AMERICAS",
  "Pumas San Clemente": "PUMAS",
  "Duao Basketball": "CLUB DEPORTIVO BASKETBALL DUAO",
  "Club Deportivo UCM": "CLUB UNIVERSIDAD CATÓLICA DEL MAULE",
  "Alameda Linares": "CLUB DE BASQUETBOL ALAMEDA LINARES",
  "JMM Juvenil": "JMM U19",
};

type Row = (string | number | null)[];

type PartidoRow = {
  fila: number;
  idExcel: number;
  jornada: number;
  fase: string;
  localExcel: string;
  visitanteExcel: string;
};

const warnings: string[] = [];
const criticalErrors: string[] = [];

function norm(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function findHeaderRow(rows: Row[]): number | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.includes("ID") && row.includes("LOCAL") && row.includes("VISITANTE")) {
      return i;
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`No se encontró el archivo en: ${EXCEL_PATH}`);
    console.error(
      "Este script requiere el Excel real de estadísticas en data/private/. No se asume ninguna ruta alternativa.",
    );
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
  const rows = XLSX.utils.sheet_to_json<Row>(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  const headerRowIdx = findHeaderRow(rows);
  if (headerRowIdx === null) {
    console.error("No se encontró el encabezado (ID, LOCAL, VISITANTE) en la hoja.");
    process.exitCode = 1;
    return;
  }

  const partidos: PartidoRow[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const idExcel = row[0];
    const jornada = row[1];
    const fase = norm(row[2] as string);
    const local = norm(row[3] as string);
    const visitante = norm(row[4] as string);

    if (idExcel === null || fase === null) continue;

    if (fase !== "Regular") continue; // Playoff sin equipos definidos: no se importa.

    if (!local || !visitante) {
      criticalErrors.push(
        `Fila ${r + 1} (ID Excel ${idExcel}): fase Regular sin local/visitante definido — omitida.`,
      );
      continue;
    }
    if (typeof jornada !== "number") {
      criticalErrors.push(
        `Fila ${r + 1} (ID Excel ${idExcel}): número de jornada inválido (${jornada}) — omitida.`,
      );
      continue;
    }

    partidos.push({
      fila: r + 1,
      idExcel: Number(idExcel),
      jornada,
      fase,
      localExcel: local,
      visitanteExcel: visitante,
    });
  }

  // Resolver nombres de club contra los ya importados. Si un nombre no
  // matchea el mapeo o el club no existe en la base, se reporta como
  // error crítico y esa fila se excluye — no se crea un club nuevo acá.
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

  const report: string[] = [];
  report.push(`Importación de fixture LBSC — ${new Date().toISOString()}`);
  report.push("=".repeat(70));

  const jornadaCache = new Map<number, { id: string }>();
  let jornadasCreadas = 0;
  let jornadasExistentes = 0;
  let partidosCreados = 0;
  let partidosExistentes = 0;

  const jornadasEnFixture = [...new Set(partidos.map((p) => p.jornada))].sort(
    (a, b) => a - b,
  );

  for (const numero of jornadasEnFixture) {
    const existing = await prisma.jornada.findUnique({ where: { numero } });
    const jornada = await prisma.jornada.upsert({
      where: { numero },
      update: {},
      create: { numero, fecha: null },
    });
    jornadaCache.set(numero, jornada);
    if (existing) jornadasExistentes++;
    else jornadasCreadas++;
  }
  report.push(
    `\nJornadas: ${jornadasCreadas} creadas, ${jornadasExistentes} ya existían.`,
  );

  report.push(`\nPartidos (fase Regular, con equipos definidos):`);
  for (const p of partidos) {
    const clubLocal = await resolveClub(p.localExcel);
    const clubVisitante = await resolveClub(p.visitanteExcel);

    if (!clubLocal || !clubVisitante) {
      const cual = !clubLocal ? p.localExcel : p.visitanteExcel;
      criticalErrors.push(
        `Fila ${p.fila} (ID Excel ${p.idExcel}, Jornada ${p.jornada}): club "${cual}" no matchea ningún club importado — partido omitido.`,
      );
      report.push(
        `  [ERROR] Fila ${p.fila}: club "${cual}" sin mapeo/no encontrado — omitida.`,
      );
      continue;
    }

    const jornada = jornadaCache.get(p.jornada);
    if (!jornada) {
      criticalErrors.push(
        `Fila ${p.fila}: jornada ${p.jornada} no resuelta — partido omitido.`,
      );
      continue;
    }

    const existing = await prisma.partido.findFirst({
      where: {
        jornadaId: jornada.id,
        clubLocalId: clubLocal.id,
        clubVisitanteId: clubVisitante.id,
      },
    });

    if (existing) {
      partidosExistentes++;
      report.push(
        `  [OK] Fila ${p.fila}: J${p.jornada} ${clubLocal.nombre} vs ${clubVisitante.nombre} — ya existía.`,
      );
    } else {
      await prisma.partido.create({
        data: {
          jornadaId: jornada.id,
          clubLocalId: clubLocal.id,
          clubVisitanteId: clubVisitante.id,
          fechaHora: null,
        },
      });
      partidosCreados++;
      report.push(
        `  [OK] Fila ${p.fila}: J${p.jornada} ${clubLocal.nombre} vs ${clubVisitante.nombre} — creado.`,
      );
    }
  }

  report.push("\n" + "=".repeat(70));
  report.push("RESUMEN");
  report.push(`Jornadas: ${jornadasCreadas} creadas, ${jornadasExistentes} ya existían.`);
  report.push(`Partidos: ${partidosCreados} creados, ${partidosExistentes} ya existían.`);
  report.push(`Warnings: ${warnings.length}`);
  report.push(`Errores críticos (filas excluidas): ${criticalErrors.length}`);
  if (criticalErrors.length > 0) {
    report.push("\nERRORES CRÍTICOS:");
    for (const e of criticalErrors) report.push(`  ${e}`);
  }

  const reportPath = path.join(
    REPORT_DIR,
    `import-report-fixture-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );
  fs.writeFileSync(reportPath, report.join("\n"), "utf-8");

  console.log(`\nJornadas: ${jornadasCreadas} creadas, ${jornadasExistentes} ya existían.`);
  console.log(`Partidos: ${partidosCreados} creados, ${partidosExistentes} ya existían.`);
  console.log(`Errores críticos (filas excluidas): ${criticalErrors.length}`);
  if (criticalErrors.length > 0) {
    console.log("\nErrores críticos:");
    for (const e of criticalErrors) console.log(`  ${e}`);
  }
  console.log(`\nReporte completo guardado en: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("Error al correr la importación de fixture:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
