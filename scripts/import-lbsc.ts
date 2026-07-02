// Importa el registro oficial de jugadores y cuerpo técnico de la Liga SC
// desde el Excel real ("data/private/REGISTRO JUGADORES LBSC 2026.xlsx").
//
// Ese archivo contiene datos personales (RUT) y nunca se sube al repo
// (data/private/ y *.xlsx están en .gitignore). Este script solo corre
// localmente/manual, no se expone en ninguna UI.
//
// Seguro de correr más de una vez: clubes se upsertean por nombre,
// jugadores y staff por (clubId, rut). Filas sin RUT no se pueden
// identificar de forma estable entre corridas, así que se excluyen y
// se reportan como error crítico en vez de arriesgar duplicados.
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";
import { CargoStaff } from "../generated/prisma/client";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data/private/REGISTRO JUGADORES LBSC 2026.xlsx",
);
const REPORT_DIR = path.join(process.cwd(), "data/private");

type Row = (string | number | null)[];

type PlayerRow = {
  fila: number;
  nombres: string;
  apellidos: string;
  rutOriginal: string | null;
};

type StaffRow = {
  fila: number;
  cargo: string;
  nombres: string;
  apellidos: string;
  rutOriginal: string | null;
};

type ClubSheet = {
  sheetName: string;
  equipo: string;
  players: PlayerRow[];
  staff: StaffRow[];
};

type Warning = { sheet: string; fila: number; mensaje: string; rut?: string };
type CriticalError = {
  sheet: string;
  fila: number;
  mensaje: string;
  rut?: string;
};

const warnings: Warning[] = [];
const criticalErrors: CriticalError[] = [];

function norm(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function titleCase(input: string): string {
  return input
    .toLocaleLowerCase("es")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part.length > 0
            ? part[0].toLocaleUpperCase("es") + part.slice(1)
            : part,
        )
        .join("-"),
    )
    .join(" ");
}

function normalizeRut(raw: string | null): {
  value: string | null;
  valid: boolean;
  cambioFormato: boolean;
} {
  if (!raw) return { value: null, valid: false, cambioFormato: false };
  const trimmedUpper = raw.trim().toUpperCase();
  const compact = trimmedUpper.replace(/\./g, "").replace(/\s+/g, "");
  const match = compact.match(/^(\d{6,8})-([\dK])$/);
  if (!match) {
    return { value: trimmedUpper, valid: false, cambioFormato: false };
  }
  const [, body, dv] = match;
  const reversed = body.split("").reverse();
  const grouped: string[] = [];
  for (let i = 0; i < reversed.length; i += 3) {
    grouped.push(reversed.slice(i, i + 3).reverse().join(""));
  }
  const formattedBody = grouped.reverse().join(".");
  const value = `${formattedBody}-${dv}`;
  const valid = body.length === 7 || body.length === 8;
  return { value, valid, cambioFormato: value !== trimmedUpper };
}

function maskRut(rut: string | null): string {
  if (!rut) return "(sin RUT)";
  return rut.length > 2 ? `${"*".repeat(rut.length - 2)}${rut.slice(-2)}` : rut;
}

function findHeaderRow(rows: Row[], colA: string, colB: string): number | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.includes(colA) && row.includes(colB)) return i;
  }
  return null;
}

function parseSheet(sheetName: string, rows: Row[]): ClubSheet | null {
  let equipo: string | null = null;
  for (const row of rows) {
    const idx = row.findIndex((c) => norm(c as string) === "Equipo:");
    if (idx !== -1) {
      equipo = norm(row[idx + 1] as string);
      break;
    }
  }
  if (!equipo) {
    warnings.push({
      sheet: sheetName,
      fila: 0,
      mensaje: "No se encontró la celda 'Equipo:' — hoja omitida.",
    });
    return null;
  }

  const headerRowIdx = findHeaderRow(rows, "N°", "NOMBRES");
  if (headerRowIdx === null) {
    warnings.push({
      sheet: sheetName,
      fila: 0,
      mensaje: "No se encontró encabezado de jugadores — hoja omitida.",
    });
    return null;
  }

  const players: PlayerRow[] = [];
  let r = headerRowIdx + 1;
  let cuerpoTecnicoRowIdx: number | null = null;
  while (r < rows.length) {
    const row = rows[r] ?? [];
    const col0 = norm(row[0] as string);
    if (col0 && col0.toUpperCase().includes("CUERPO")) {
      cuerpoTecnicoRowIdx = r;
      break;
    }
    const nombres = norm(row[1] as string);
    const apellidos = norm(row[2] as string);
    const rutOriginal = norm(row[3] as string);
    if (nombres && apellidos) {
      players.push({ fila: r + 1, nombres, apellidos, rutOriginal });
    } else if (nombres || apellidos || rutOriginal) {
      criticalErrors.push({
        sheet: sheetName,
        fila: r + 1,
        mensaje: `Fila incompleta (falta nombres o apellidos): nombres=${nombres ?? "-"} apellidos=${apellidos ?? "-"}`,
      });
    }
    r++;
  }

  const staff: StaffRow[] = [];
  if (cuerpoTecnicoRowIdx !== null) {
    // La fila siguiente a "CUERPO TÉCNICO" es el encabezado (CARGO, NOMBRES, APELLIDOS, CÉDULA).
    let sr = cuerpoTecnicoRowIdx + 2;
    while (sr < rows.length) {
      const row = rows[sr] ?? [];
      const cargo = norm(row[0] as string);
      const nombres = norm(row[1] as string);
      const apellidos = norm(row[2] as string);
      const rutOriginal = norm(row[3] as string);
      if (!cargo && !nombres && !apellidos) {
        sr++;
        continue;
      }
      if (cargo && cargo.toUpperCase().includes("LIGA DE")) break;
      if (cargo && nombres && apellidos) {
        staff.push({ fila: sr + 1, cargo, nombres, apellidos, rutOriginal });
      } else if (cargo) {
        // Cargo definido (ej. "Ayudante") pero sin persona cargada: slot vacío, no es un error.
      }
      sr++;
    }
  }

  return { sheetName, equipo, players, staff };
}

function mapCargo(cargo: string): CargoStaff | null {
  const c = cargo.trim().toUpperCase();
  if (c === "ENTRENADOR") return CargoStaff.ENTRENADOR;
  if (c === "AYUDANTE") return CargoStaff.AYUDANTE;
  return null;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`No se encontró el archivo en: ${EXCEL_PATH}`);
    console.error(
      "Este script requiere el Excel real del registro de jugadores en data/private/. No se asume ninguna ruta alternativa.",
    );
    process.exitCode = 1;
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const clubSheets: ClubSheet[] = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, {
      header: 1,
      raw: true,
      defval: null,
    });
    const parsed = parseSheet(sheetName, rows);
    if (parsed) clubSheets.push(parsed);
  }

  // Detección de RUT duplicado dentro del mismo club (antes de tocar la base).
  for (const club of clubSheets) {
    const seenInClub = new Map<string, PlayerRow[]>();
    for (const p of club.players) {
      const { value: rutNorm } = normalizeRut(p.rutOriginal);
      if (!rutNorm) continue;
      const list = seenInClub.get(rutNorm) ?? [];
      list.push(p);
      seenInClub.set(rutNorm, list);
    }
    for (const [rutNorm, rows] of seenInClub) {
      if (rows.length > 1) {
        for (const row of rows) {
          criticalErrors.push({
            sheet: club.sheetName,
            fila: row.fila,
            mensaje: `RUT duplicado dentro del mismo club (${rows.length} filas) — no se puede determinar cuál es correcta, se excluyen todas.`,
            rut: rutNorm,
          });
        }
      }
    }
  }
  const duplicateWithinClub = new Set(
    criticalErrors
      .filter((e) => e.mensaje.startsWith("RUT duplicado dentro"))
      .map((e) => `${e.sheet}#${e.fila}`),
  );

  const report: string[] = [];
  report.push(`Importación registro oficial LBSC — ${new Date().toISOString()}`);
  report.push("=".repeat(70));

  let totalClubes = 0;
  let totalJugadoresCreados = 0;
  let totalJugadoresActualizados = 0;
  let totalStaffCreados = 0;
  let totalStaffActualizados = 0;

  for (const club of clubSheets) {
    const dbClub = await prisma.club.upsert({
      where: { nombre: club.equipo },
      update: {},
      create: { nombre: club.equipo },
    });
    totalClubes++;
    report.push(`\n## ${club.sheetName} — ${club.equipo} (clubId=${dbClub.id})`);

    for (const p of club.players) {
      if (duplicateWithinClub.has(`${club.sheetName}#${p.fila}`)) {
        report.push(`  [ERROR] Fila ${p.fila}: excluida por RUT duplicado en el club.`);
        continue;
      }
      const { value: rutNorm, valid, cambioFormato } = normalizeRut(p.rutOriginal);
      if (!rutNorm) {
        criticalErrors.push({
          sheet: club.sheetName,
          fila: p.fila,
          mensaje: `Sin RUT — no se puede importar de forma idempotente, fila excluida.`,
        });
        report.push(`  [ERROR] Fila ${p.fila}: sin RUT, excluida.`);
        continue;
      }
      if (!valid) {
        warnings.push({
          sheet: club.sheetName,
          fila: p.fila,
          mensaje: "RUT con formato fuera de lo esperado, se importa igual.",
          rut: rutNorm,
        });
      } else if (cambioFormato) {
        warnings.push({
          sheet: club.sheetName,
          fila: p.fila,
          mensaje: "RUT reformateado automáticamente (puntos mal ubicados en el origen).",
          rut: rutNorm,
        });
      }

      const nombreCompleto = `${titleCase(p.nombres)} ${titleCase(p.apellidos)}`;
      const existing = await prisma.jugador.findUnique({
        where: { clubId_rut: { clubId: dbClub.id, rut: rutNorm } },
      });
      await prisma.jugador.upsert({
        where: { clubId_rut: { clubId: dbClub.id, rut: rutNorm } },
        update: { nombre: nombreCompleto },
        create: {
          clubId: dbClub.id,
          nombre: nombreCompleto,
          rut: rutNorm,
          numeroCamiseta: null,
        },
      });
      if (existing) {
        totalJugadoresActualizados++;
      } else {
        totalJugadoresCreados++;
      }
      report.push(
        `  [OK] Fila ${p.fila}: ${nombreCompleto} (${maskRut(rutNorm)}) ${existing ? "actualizado" : "creado"}.`,
      );
    }

    for (const s of club.staff) {
      const cargo = mapCargo(s.cargo);
      if (!cargo) {
        criticalErrors.push({
          sheet: club.sheetName,
          fila: s.fila,
          mensaje: `Cargo no reconocido: "${s.cargo}" — fila excluida.`,
        });
        continue;
      }
      const { value: rutNorm, valid, cambioFormato } = normalizeRut(s.rutOriginal);
      if (!rutNorm) {
        criticalErrors.push({
          sheet: club.sheetName,
          fila: s.fila,
          mensaje: `Sin RUT — no se puede importar de forma idempotente, fila excluida.`,
        });
        report.push(`  [ERROR] Staff fila ${s.fila}: sin RUT, excluida.`);
        continue;
      }
      if (!valid) {
        warnings.push({
          sheet: club.sheetName,
          fila: s.fila,
          mensaje: "RUT de staff con formato fuera de lo esperado, se importa igual.",
          rut: rutNorm,
        });
      } else if (cambioFormato) {
        warnings.push({
          sheet: club.sheetName,
          fila: s.fila,
          mensaje: "RUT de staff reformateado automáticamente.",
          rut: rutNorm,
        });
      }

      const existing = await prisma.clubStaff.findUnique({
        where: { clubId_rut: { clubId: dbClub.id, rut: rutNorm } },
      });
      await prisma.clubStaff.upsert({
        where: { clubId_rut: { clubId: dbClub.id, rut: rutNorm } },
        update: {
          cargo,
          nombres: titleCase(s.nombres),
          apellidos: titleCase(s.apellidos),
        },
        create: {
          clubId: dbClub.id,
          cargo,
          nombres: titleCase(s.nombres),
          apellidos: titleCase(s.apellidos),
          rut: rutNorm,
        },
      });
      if (existing) {
        totalStaffActualizados++;
      } else {
        totalStaffCreados++;
      }
      report.push(
        `  [OK] Staff fila ${s.fila}: ${s.cargo} ${titleCase(s.nombres)} ${titleCase(s.apellidos)} (${maskRut(rutNorm)}) ${existing ? "actualizado" : "creado"}.`,
      );
    }
  }

  // Warning de RUT duplicado entre clubes distintos (no bloquea, solo informa).
  const rutToClubs = new Map<string, Set<string>>();
  for (const club of clubSheets) {
    for (const p of club.players) {
      const { value: rutNorm } = normalizeRut(p.rutOriginal);
      if (!rutNorm) continue;
      const set = rutToClubs.get(rutNorm) ?? new Set<string>();
      set.add(club.equipo);
      rutToClubs.set(rutNorm, set);
    }
  }
  for (const [rutNorm, clubs] of rutToClubs) {
    if (clubs.size > 1) {
      warnings.push({
        sheet: "(cruzado)",
        fila: 0,
        mensaje: `RUT ${maskRut(rutNorm)} aparece en más de un club: ${[...clubs].join(", ")}.`,
        rut: rutNorm,
      });
    }
  }

  report.push("\n" + "=".repeat(70));
  report.push("RESUMEN");
  report.push(`Clubes procesados: ${totalClubes}`);
  report.push(
    `Jugadores: ${totalJugadoresCreados} creados, ${totalJugadoresActualizados} actualizados.`,
  );
  report.push(
    `Cuerpo técnico: ${totalStaffCreados} creados, ${totalStaffActualizados} actualizados.`,
  );
  report.push(`Warnings: ${warnings.length}`);
  report.push(`Errores críticos (filas excluidas): ${criticalErrors.length}`);

  if (warnings.length > 0) {
    report.push("\nWARNINGS:");
    for (const w of warnings) {
      report.push(`  [${w.sheet} fila ${w.fila}] ${w.mensaje}${w.rut ? ` (RUT: ${w.rut})` : ""}`);
    }
  }
  if (criticalErrors.length > 0) {
    report.push("\nERRORES CRÍTICOS:");
    for (const e of criticalErrors) {
      report.push(`  [${e.sheet} fila ${e.fila}] ${e.mensaje}${e.rut ? ` (RUT: ${e.rut})` : ""}`);
    }
  }

  const reportPath = path.join(
    REPORT_DIR,
    `import-report-lbsc-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );
  fs.writeFileSync(reportPath, report.join("\n"), "utf-8");

  console.log(`\nClubes procesados: ${totalClubes}`);
  console.log(
    `Jugadores: ${totalJugadoresCreados} creados, ${totalJugadoresActualizados} actualizados.`,
  );
  console.log(
    `Cuerpo técnico: ${totalStaffCreados} creados, ${totalStaffActualizados} actualizados.`,
  );
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Errores críticos (filas excluidas): ${criticalErrors.length}`);
  if (warnings.length > 0) {
    console.log("\nWarnings (RUT enmascarado):");
    for (const w of warnings) {
      console.log(`  [${w.sheet} fila ${w.fila}] ${w.mensaje}${w.rut ? ` (RUT: ${maskRut(w.rut)})` : ""}`);
    }
  }
  if (criticalErrors.length > 0) {
    console.log("\nErrores críticos (RUT enmascarado):");
    for (const e of criticalErrors) {
      console.log(`  [${e.sheet} fila ${e.fila}] ${e.mensaje}${e.rut ? ` (RUT: ${maskRut(e.rut)})` : ""}`);
    }
  }
  console.log(`\nReporte completo (con RUT sin enmascarar) guardado en: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("Error al correr la importación:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
