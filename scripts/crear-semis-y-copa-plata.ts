// Crea las Semifinales (Jornada 9) y la Copa de Plata (Jornada 10) del
// domingo 13 de septiembre de 2026.
//
// Se crean como DOS jornadas separadas a propósito, aunque se jueguen el mismo
// día: rondaDeJornada() en lib/public/playoffs-data.ts detecta la ronda del
// bracket por el nombre de la jornada, así que "Semifinales" entra al cuadro
// principal y "Copa de Plata" queda fuera de él (su nombre no matchea ninguna
// keyword de ronda) y se muestra como bloque propio en /calendario. Meter las
// cuatro en una sola jornada obligaría a mezclar dos competencias distintas
// bajo una etiqueta.
//
// Los partidos se crean directamente en CONFIRMADO —el estado que Mesa
// necesita para poder abrirlos— aplicando la misma validación de plantel que
// confirmarPartido() en app/admin/partidos/[id]/actions.ts. La vez anterior se
// crearon en PROGRAMADO y hubo que confirmarlos en un segundo paso.
//
// ZONA HORARIA: el 13-sep-2026 Chile está en horario de verano (-03:00). El
// assert de horas formatea en America/Santiago y aborta si alguna no da
// exacta, así que un error de offset no puede pasar en silencio.
//
// Escribe con SQL crudo por la misma razón que el resto de los scripts: el
// cliente Prisma generado en este entorno no conoce Jornada.fase.
//
// Dry-run por defecto; solo escribe con --confirm.
import "dotenv/config";
import * as crypto from "node:crypto";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");
const FECHA_JORNADA = "2026-09-13T04:00:00.000Z";

type Cruce = { local: string; visitante: string; horaChile: string; utc: string };

const SEMIFINALES: Cruce[] = [
  { local: "CSDC JORGE MENESES MATURANA", visitante: "PUMAS", horaChile: "18:20", utc: "2026-09-13T21:20:00.000Z" },
  { local: "C.D. PARK", visitante: "LAS AMERICAS", horaChile: "20:00", utc: "2026-09-13T23:00:00.000Z" },
];

const COPA_PLATA: Cruce[] = [
  { local: "JMM U19", visitante: "CLUB DE BASQUETBOL ALAMEDA LINARES", horaChile: "15:00", utc: "2026-09-13T18:00:00.000Z" },
  { local: "CLUB DEPORTIVO BASKETBALL DUAO", visitante: "CLUB UNIVERSIDAD CATÓLICA DEL MAULE", horaChile: "16:40", utc: "2026-09-13T19:40:00.000Z" },
];

const JORNADAS = [
  { numero: 9, nombre: "Semifinales", cruces: SEMIFINALES },
  { numero: 10, nombre: "Copa de Plata", cruces: COPA_PLATA },
];

const horaChile = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false,
});
const diaChile = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long",
});

function nuevoId(): string {
  return "c" + crypto.randomBytes(12).toString("hex").slice(0, 24);
}

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN (sin --confirm, no se escribe nada) ===");

  // --- Assert 1: las jornadas 9 y 10 no existen
  for (const j of JORNADAS) {
    const n = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM jornadas WHERE numero = $1`, j.numero);
    if (Number(n[0].n) > 0) throw new Error(`Ya existe la Jornada ${j.numero} — abortando.`);
  }
  console.log("\n[OK] Las Jornadas 9 y 10 no existen todavía.");

  // --- Assert 2: ganadores y perdedores REALES de cuartos, leídos de la base
  const cuartos = await prisma.$queryRawUnsafe<any[]>(`
    SELECT cl.nombre AS local, cv.nombre AS visitante, a."resultadoLocal" AS rl, a."resultadoVisitante" AS rv
    FROM partidos p
    JOIN jornadas j ON j.id=p."jornadaId"
    JOIN clubes cl ON cl.id=p."clubLocalId"
    JOIN clubes cv ON cv.id=p."clubVisitanteId"
    JOIN actas a ON a."partidoId"=p.id
    WHERE j.numero=8 AND p.estado='FINALIZADO'`);
  if (cuartos.length !== 4) throw new Error(`Se esperaban 4 cuartos finalizados con acta, hay ${cuartos.length} — abortando.`);

  const ganadores = new Set<string>();
  const perdedores = new Set<string>();
  for (const c of cuartos) {
    if (c.rl === c.rv) throw new Error(`Cuarto empatado (${c.local} vs ${c.visitante}) — abortando.`);
    const gana = c.rl > c.rv ? c.local : c.visitante;
    const pierde = c.rl > c.rv ? c.visitante : c.local;
    ganadores.add(gana);
    perdedores.add(pierde);
  }
  console.log(`[OK] Cuartos leídos: 4 finalizados, sin empates.`);
  console.log(`     Ganadores:  ${[...ganadores].join(" · ")}`);
  console.log(`     Eliminados: ${[...perdedores].join(" · ")}`);

  // Las semis solo pueden enfrentar ganadores; la Copa de Plata solo eliminados.
  for (const c of SEMIFINALES) {
    for (const club of [c.local, c.visitante]) {
      if (!ganadores.has(club)) throw new Error(`"${club}" no ganó su cuarto pero está en una semifinal — abortando.`);
    }
  }
  for (const c of COPA_PLATA) {
    for (const club of [c.local, c.visitante]) {
      if (!perdedores.has(club)) throw new Error(`"${club}" no perdió su cuarto pero está en Copa de Plata — abortando.`);
    }
  }
  console.log("[OK] Semifinales solo con ganadores; Copa de Plata solo con eliminados.");

  // --- Assert 3: clubes resuelven y tienen plantel (misma regla que confirmarPartido)
  const todos = [...SEMIFINALES, ...COPA_PLATA].flatMap((c) => [c.local, c.visitante]);
  const clubes = await prisma.$queryRawUnsafe<any[]>(`
    SELECT c.id, c.nombre, (SELECT COUNT(*)::int FROM jugadores WHERE "clubId"=c.id AND activo=true) AS jugadores
    FROM clubes c WHERE c.nombre = ANY($1::text[])`, todos);
  const porNombre = new Map(clubes.map((c) => [c.nombre, c]));
  for (const n of new Set(todos)) {
    const c = porNombre.get(n);
    if (!c) throw new Error(`Club no encontrado por nombre exacto: "${n}" — abortando.`);
    if (c.jugadores === 0) throw new Error(`"${n}" no tiene jugadores activos — no se puede confirmar — abortando.`);
  }
  console.log(`[OK] Los 8 clubes resuelven y tienen plantel cargado.`);

  // --- Assert 4: las horas dan exactas en Chile (detecta error de DST)
  for (const c of [...SEMIFINALES, ...COPA_PLATA]) {
    const real = horaChile.format(new Date(c.utc));
    if (real !== c.horaChile) throw new Error(`Hora incorrecta para ${c.local}: esperaba ${c.horaChile} y da ${real} — abortando.`);
  }
  console.log(`[OK] Las 4 horas dan exactas en America/Santiago (${diaChile.format(new Date(SEMIFINALES[0].utc))}).`);

  console.log("\nA crear:");
  for (const j of JORNADAS) {
    console.log(`\n  Jornada ${j.numero} "${j.nombre}" — fase PLAYOFFS — ${FECHA_JORNADA.slice(0, 10)}`);
    for (const c of j.cruces) {
      console.log(`    ${c.horaChile}  ${c.local}  vs  ${c.visitante}   [CONFIRMADO — Mesa puede abrirlo]`);
    }
  }

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const j of JORNADAS) {
      const jornadaId = nuevoId();
      await tx.$executeRawUnsafe(
        `INSERT INTO jornadas (id, numero, fecha, nombre, fase, "createdAt")
         VALUES ($1, $2, $3::timestamptz, $4, 'PLAYOFFS', now())`,
        jornadaId, j.numero, FECHA_JORNADA, j.nombre,
      );
      for (const c of j.cruces) {
        await tx.$executeRawUnsafe(
          `INSERT INTO partidos (id, "jornadaId", "clubLocalId", "clubVisitanteId", "fechaHora", cancha, estado,
                                 "cuartoActual", "duracionCuartoMinutos", "relojEstado", "relojRestanteSegundos",
                                 "relojUltimoInicio", "mesaOperadorId", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5::timestamptz,NULL,'CONFIRMADO',0,10,'PAUSADO',NULL,NULL,NULL,now(),now())`,
          nuevoId(), jornadaId, porNombre.get(c.local)!.id, porNombre.get(c.visitante)!.id, c.utc,
        );
      }
    }
  });

  console.log("\nEscrito OK.");
  const verif = await prisma.$queryRawUnsafe<any[]>(`
    SELECT j.numero, j.nombre AS jornada, j.fase::text AS fase,
           to_char(p."fechaHora" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago','YYYY-MM-DD HH24:MI') AS chile,
           cl.nombre AS local, cv.nombre AS visitante, p.estado::text AS estado
    FROM partidos p
    JOIN jornadas j ON j.id=p."jornadaId"
    JOIN clubes cl ON cl.id=p."clubLocalId"
    JOIN clubes cv ON cv.id=p."clubVisitanteId"
    WHERE j.numero IN (9,10) ORDER BY p."fechaHora"`);
  console.log("\nVerificación desde la base:");
  for (const v of verif) console.log(`  [${v.jornada}] ${v.chile}  ${v.local} vs ${v.visitante}  (${v.estado})`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("ERROR:", e.message ?? e); process.exitCode = 1; });
