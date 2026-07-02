// Importa la Fecha 1 (jornada 1, ya jugada) como histórico agregado, desde
// el Excel real de estadísticas ("data/private/Estadisticas_Liga_San_Clemente_CLAUDE.xlsx").
//
// Fuente de resultado/box score: hoja 🏀 PARTIDOS (única fuente completa
// para los 4 partidos). MVP: hoja 📌 FECHA 1. Dorsales reales: hojas
// 🧾 MESA DIGITAL y ⚡ MESA RÁPIDA — son workspaces "vivos" que hoy solo
// tienen cargado el detalle de 2 de los 4 partidos, así que el backfill de
// numeroCamiseta es oportunista/parcial, no completo.
//
// No se crea ningún MatchEvent: estos partidos no tienen timeline, solo
// resultado agregado (JugadorPartidoStat con origen = IMPORTADO).
//
// Idempotente: Partido se actualiza por id ya existente (de PR 1.2), Acta
// upsert por partidoId, JugadorPartidoStat upsert por (partidoId, jugadorId).
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../lib/db";
import { EstadoPartido, OrigenStat } from "../generated/prisma/client";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data/private/Estadisticas_Liga_San_Clemente_CLAUDE.xlsx",
);
const REPORT_DIR = path.join(process.cwd(), "data/private");

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

const warnings: string[] = [];
const criticalErrors: string[] = [];

function norm(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function normKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function officialClubName(nombreExcel: string): string | null {
  return CLUB_NAME_MAP[nombreExcel] ?? null;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`No se encontró el archivo en: ${EXCEL_PATH}`);
    process.exitCode = 1;
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const report: string[] = [];
  report.push(`Importación Fecha 1 LBSC — ${new Date().toISOString()}`);
  report.push("=".repeat(70));

  // --- 1. Partidos (hoja PARTIDOS, jornada 1, fase Regular) ---
  const wsPartidos = workbook.Sheets["🏀 PARTIDOS"];
  const rowsPartidos = XLSX.utils.sheet_to_json<Row>(wsPartidos, {
    header: 1,
    raw: true,
    defval: null,
  });
  const headerIdx = rowsPartidos.findIndex(
    (r) => r.includes("ID") && r.includes("LOCAL") && r.includes("VISITANTE"),
  );
  if (headerIdx === -1) {
    console.error("No se encontró el encabezado en la hoja PARTIDOS.");
    process.exitCode = 1;
    return;
  }

  type PartidoFecha1 = {
    fila: number;
    idExcel: number;
    localExcel: string;
    visitanteExcel: string;
    ptLocal: number;
    ptVisita: number;
    goleadores: { nombre: string; pts: number }[];
  };

  const partidosFecha1: PartidoFecha1[] = [];
  for (let r = headerIdx + 1; r < rowsPartidos.length; r++) {
    const row = rowsPartidos[r] ?? [];
    const idExcel = row[0];
    const jornada = row[1];
    const fase = norm(row[2] as string);
    if (jornada !== 1 || fase !== "Regular") continue;

    const localExcel = norm(row[3] as string);
    const visitanteExcel = norm(row[4] as string);
    const ptLocal = row[5];
    const ptVisita = row[6];
    if (!localExcel || !visitanteExcel || typeof ptLocal !== "number" || typeof ptVisita !== "number") {
      criticalErrors.push(`Fila ${r + 1}: datos de partido incompletos — omitida.`);
      continue;
    }

    const goleadores: { nombre: string; pts: number }[] = [];
    for (let col = 8; col < row.length; col += 2) {
      const nombre = norm(row[col] as string);
      const pts = row[col + 1];
      if (nombre && typeof pts === "number") {
        goleadores.push({ nombre, pts });
      }
    }

    partidosFecha1.push({
      fila: r + 1,
      idExcel: Number(idExcel),
      localExcel,
      visitanteExcel,
      ptLocal,
      ptVisita,
      goleadores,
    });
  }

  // --- 2. MVP por partido (hoja FECHA 1) ---
  const wsFecha1 = workbook.Sheets["📌 FECHA 1"];
  const mvpPorIdExcel = new Map<number, string>();
  if (wsFecha1) {
    const rowsFecha1 = XLSX.utils.sheet_to_json<Row>(wsFecha1, {
      header: 1,
      raw: true,
      defval: null,
    });
    const h = rowsFecha1.findIndex((r) => r.includes("PARTIDO") && r.includes("MVP"));
    if (h !== -1) {
      for (let r = h + 1; r < rowsFecha1.length; r++) {
        const row = rowsFecha1[r] ?? [];
        const partido = row[0];
        const mvp = norm(row[6] as string);
        if (typeof partido === "number" && mvp) mvpPorIdExcel.set(partido, mvp);
        else break;
      }
    }
  }

  // --- 3. Dorsales reales oportunistas (MESA DIGITAL + MESA RÁPIDA) ---
  type Dorsal = { equipoExcel: string; numero: number; nombre: string };
  const dorsalesReales: Dorsal[] = [];

  const wsMesaDigital = workbook.Sheets["🧾 MESA DIGITAL"];
  if (wsMesaDigital) {
    const get = (cellRef: string) => wsMesaDigital[cellRef]?.v ?? null;
    const equipoA = norm(get("E4") as string);
    const equipoB = norm(get("G4") as string);
    for (let r = 13; r <= 27; r++) {
      const numA = get(`A${r}`);
      const jugA = norm(get(`B${r}`) as string);
      if (equipoA && typeof numA === "number" && jugA) {
        dorsalesReales.push({ equipoExcel: equipoA, numero: numA, nombre: jugA });
      }
      const numB = get(`I${r}`);
      const jugB = norm(get(`J${r}`) as string);
      if (equipoB && typeof numB === "number" && jugB) {
        dorsalesReales.push({ equipoExcel: equipoB, numero: numB, nombre: jugB });
      }
    }
  }

  const wsMesaRapida = workbook.Sheets["⚡ MESA RÁPIDA"];
  if (wsMesaRapida) {
    const get = (cellRef: string) => wsMesaRapida[cellRef]?.v ?? null;
    const equipoALabel = norm(get("A5") as string);
    const equipoBLabel = norm(get("I5") as string);
    const equipoA = equipoALabel?.split(":")[1]?.trim() ?? null;
    const equipoB = equipoBLabel?.split(":")[1]?.trim() ?? null;
    for (let r = 7; r <= 25; r++) {
      const numA = get(`A${r}`);
      const jugA = norm(get(`B${r}`) as string);
      if (equipoA && typeof numA === "number" && jugA) {
        dorsalesReales.push({ equipoExcel: equipoA, numero: numA, nombre: jugA });
      }
      const numB = get(`I${r}`);
      const jugB = norm(get(`J${r}`) as string);
      if (equipoB && typeof numB === "number" && jugB) {
        dorsalesReales.push({ equipoExcel: equipoB, numero: numB, nombre: jugB });
      }
    }
  }

  // --- 4. Procesar cada partido contra la base ---
  let partidosFinalizados = 0;
  let actasCreadas = 0;
  let statsCreados = 0;
  let statsActualizados = 0;

  for (const pf of partidosFecha1) {
    const nombreLocalOficial = officialClubName(pf.localExcel);
    const nombreVisitanteOficial = officialClubName(pf.visitanteExcel);
    if (!nombreLocalOficial || !nombreVisitanteOficial) {
      criticalErrors.push(
        `Fila ${pf.fila} (ID Excel ${pf.idExcel}): club sin mapeo — omitida.`,
      );
      continue;
    }

    const clubLocal = await prisma.club.findUnique({ where: { nombre: nombreLocalOficial } });
    const clubVisitante = await prisma.club.findUnique({ where: { nombre: nombreVisitanteOficial } });
    if (!clubLocal || !clubVisitante) {
      criticalErrors.push(
        `Fila ${pf.fila} (ID Excel ${pf.idExcel}): club no encontrado en la base — omitida.`,
      );
      continue;
    }

    const partido = await prisma.partido.findFirst({
      where: {
        clubLocalId: clubLocal.id,
        clubVisitanteId: clubVisitante.id,
        jornada: { numero: 1 },
      },
    });
    if (!partido) {
      criticalErrors.push(
        `Fila ${pf.fila}: no existe el Partido (${nombreLocalOficial} vs ${nombreVisitanteOficial}, jornada 1) en la base — corré PR 1.2 primero. Omitida.`,
      );
      continue;
    }

    report.push(
      `\n## Partido ${pf.idExcel}: ${nombreLocalOficial} ${pf.ptLocal} - ${pf.ptVisita} ${nombreVisitanteOficial}`,
    );

    // Resolver jugadores por normalizado dentro de los 2 clubes del partido.
    const jugadoresLocal = await prisma.jugador.findMany({ where: { clubId: clubLocal.id } });
    const jugadoresVisitante = await prisma.jugador.findMany({ where: { clubId: clubVisitante.id } });
    const mapLocal = new Map(jugadoresLocal.map((j) => [normKey(j.nombre), j]));
    const mapVisitante = new Map(jugadoresVisitante.map((j) => [normKey(j.nombre), j]));

    function resolveJugador(nombreExcel: string) {
      const key = normKey(nombreExcel);
      const enLocal = mapLocal.get(key);
      const enVisitante = mapVisitante.get(key);
      if (enLocal && enVisitante) return { jugador: null, ambiguo: true };
      const jugador = enLocal ?? enVisitante ?? null;
      return { jugador, ambiguo: false };
    }

    // Box score agregado.
    for (const g of pf.goleadores) {
      const { jugador, ambiguo } = resolveJugador(g.nombre);
      if (ambiguo) {
        criticalErrors.push(
          `Partido ${pf.idExcel}: "${g.nombre}" matchea jugadores en ambos clubes del partido — no se puede resolver, fila omitida.`,
        );
        continue;
      }
      if (!jugador) {
        criticalErrors.push(
          `Partido ${pf.idExcel}: goleador "${g.nombre}" no matchea ningún jugador real de ${nombreLocalOficial}/${nombreVisitanteOficial} — no se importa.`,
        );
        continue;
      }
      const existing = await prisma.jugadorPartidoStat.findUnique({
        where: { partidoId_jugadorId: { partidoId: partido.id, jugadorId: jugador.id } },
      });
      await prisma.jugadorPartidoStat.upsert({
        where: { partidoId_jugadorId: { partidoId: partido.id, jugadorId: jugador.id } },
        update: { puntos: g.pts, origen: OrigenStat.IMPORTADO },
        create: {
          partidoId: partido.id,
          jugadorId: jugador.id,
          clubId: jugador.clubId,
          puntos: g.pts,
          faltas: null,
          origen: OrigenStat.IMPORTADO,
        },
      });
      if (existing) statsActualizados++;
      else statsCreados++;
      report.push(`  [OK] ${jugador.nombre}: ${g.pts} pts.`);
    }

    // MVP.
    const mvpNombreExcel = mvpPorIdExcel.get(pf.idExcel);
    let mvpJugadorId: string | null = null;
    if (mvpNombreExcel) {
      const { jugador, ambiguo } = resolveJugador(mvpNombreExcel);
      if (ambiguo || !jugador) {
        criticalErrors.push(
          `Partido ${pf.idExcel}: MVP "${mvpNombreExcel}" no se pudo resolver a un jugador único — Acta queda sin MVP.`,
        );
      } else {
        mvpJugadorId = jugador.id;
      }
    }

    // Partido -> FINALIZADO.
    await prisma.partido.update({
      where: { id: partido.id },
      data: { estado: EstadoPartido.FINALIZADO },
    });
    partidosFinalizados++;

    // Acta (upsert por partidoId).
    const existingActa = await prisma.acta.findUnique({ where: { partidoId: partido.id } });
    await prisma.acta.upsert({
      where: { partidoId: partido.id },
      update: {
        resultadoLocal: pf.ptLocal,
        resultadoVisitante: pf.ptVisita,
        mvpJugadorId,
      },
      create: {
        partidoId: partido.id,
        resultadoLocal: pf.ptLocal,
        resultadoVisitante: pf.ptVisita,
        mvpJugadorId,
      },
    });
    if (!existingActa) actasCreadas++;
    report.push(`  Acta: ${pf.ptLocal}-${pf.ptVisita}, MVP: ${mvpNombreExcel ?? "(sin dato)"}`);

    // Backfill de dorsales reales para los jugadores de este partido.
    const dorsalesDelPartido = dorsalesReales.filter(
      (d) => d.equipoExcel === pf.localExcel || d.equipoExcel === pf.visitanteExcel,
    );
    for (const d of dorsalesDelPartido) {
      const { jugador, ambiguo } = resolveJugador(d.nombre);
      if (ambiguo || !jugador) continue; // ya se reportó arriba si corresponde
      if (jugador.numeroCamiseta !== null) continue; // no se sobreescribe un valor ya asignado

      const conflicto = await prisma.jugador.findFirst({
        where: { clubId: jugador.clubId, numeroCamiseta: d.numero, id: { not: jugador.id } },
      });
      if (conflicto) {
        warnings.push(
          `Club de ${jugador.nombre}: el dorsal ${d.numero} ya está asignado a otro jugador (${conflicto.nombre}) — no se sobreescribe.`,
        );
        continue;
      }

      await prisma.jugador.update({
        where: { id: jugador.id },
        data: { numeroCamiseta: d.numero },
      });
      report.push(`  [DORSAL] ${jugador.nombre}: numeroCamiseta = ${d.numero}.`);
    }
  }

  report.push("\n" + "=".repeat(70));
  report.push("RESUMEN");
  report.push(`Partidos marcados FINALIZADO: ${partidosFinalizados}`);
  report.push(`Actas: ${actasCreadas} creadas (o actualizadas si ya existían).`);
  report.push(`JugadorPartidoStat: ${statsCreados} creados, ${statsActualizados} actualizados.`);
  report.push(`Warnings: ${warnings.length}`);
  report.push(`Errores críticos: ${criticalErrors.length}`);
  if (warnings.length > 0) {
    report.push("\nWARNINGS:");
    for (const w of warnings) report.push(`  ${w}`);
  }
  if (criticalErrors.length > 0) {
    report.push("\nERRORES CRÍTICOS:");
    for (const e of criticalErrors) report.push(`  ${e}`);
  }

  const reportPath = path.join(
    REPORT_DIR,
    `import-report-fecha1-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );
  fs.writeFileSync(reportPath, report.join("\n"), "utf-8");

  console.log(`\nPartidos marcados FINALIZADO: ${partidosFinalizados}`);
  console.log(`JugadorPartidoStat: ${statsCreados} creados, ${statsActualizados} actualizados.`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Errores críticos: ${criticalErrors.length}`);
  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ${w}`);
  }
  if (criticalErrors.length > 0) {
    console.log("\nErrores críticos:");
    for (const e of criticalErrors) console.log(`  ${e}`);
  }
  console.log(`\nReporte completo guardado en: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("Error al correr la importación de Fecha 1:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
