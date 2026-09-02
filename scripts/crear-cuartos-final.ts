// Crea la Jornada 8 "Cuartos de Final" (fase PLAYOFFS) con sus 4 partidos del
// domingo 6 de septiembre de 2026.
//
// Escribe con SQL crudo, no con el cliente de Prisma, porque el cliente
// generado en este entorno no conoce la columna `fase` (el CLI de prisma se
// cuelga acá y no puede regenerarlo — mismo motivo por el que el reloj del
// partido se lee/escribe con SQL en lib/mesa/reloj-db.ts). En producción el
// cliente sí se regenera en el build de Vercel.
//
// OJO ZONA HORARIA: el domingo 6-sep-2026 Chile YA está en horario de verano
// (-03:00); el cambio ocurre a medianoche del sábado 5. Los scripts anteriores
// de este repo usan -04:00 porque manejaban fechas de invierno — copiar ese
// patrón dejaría los 4 partidos una hora tarde. Por eso el assert #4 verifica
// la hora final formateada en America/Santiago antes de escribir nada.
//
// Dry-run por defecto; solo escribe con --confirm.
import "dotenv/config";
import * as crypto from "node:crypto";
import { prisma } from "../lib/db";

const CONFIRM = process.argv.includes("--confirm");

const JORNADA_NUMERO = 8;
const JORNADA_NOMBRE = "Cuartos de Final";
// Mismo formato que las jornadas existentes: medianoche UTC + 4h del día.
const JORNADA_FECHA = "2026-09-06T04:00:00.000Z";

// El primero de cada par es el LOCAL (mejor sembrado, según 1v8/4v5/2v7/3v6).
const CRUCES: { local: string; visitante: string; horaChile: string; fechaHoraUtc: string }[] = [
  { local: "C.D. PARK", visitante: "CLUB UNIVERSIDAD CATÓLICA DEL MAULE", horaChile: "15:00", fechaHoraUtc: "2026-09-06T18:00:00.000Z" },
  { local: "PUMAS", visitante: "CLUB DE BASQUETBOL ALAMEDA LINARES", horaChile: "16:40", fechaHoraUtc: "2026-09-06T19:40:00.000Z" },
  { local: "LAS AMERICAS", visitante: "CLUB DEPORTIVO BASKETBALL DUAO", horaChile: "18:20", fechaHoraUtc: "2026-09-06T21:20:00.000Z" },
  { local: "CSDC JORGE MENESES MATURANA", visitante: "JMM U19", horaChile: "20:00", fechaHoraUtc: "2026-09-06T23:00:00.000Z" },
];

const horaChileFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const diaChileFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "long",
  day: "numeric",
  month: "long",
});

// cuid-like: los ids existentes son cuid v2 de 25 chars. No hace falta que sea
// un cuid real (la columna es String), pero se mantiene el formato para que no
// desentone con el resto de la tabla.
function nuevoId(): string {
  return "c" + crypto.randomBytes(12).toString("hex").slice(0, 24);
}

// Tabla de la fase regular calculada con SQL, para el assert de siembra. No se
// usa getStandings() porque también depende del cliente Prisma sin `fase`.
async function siembraFaseRegular(): Promise<{ pos: number; club: string }[]> {
  const filas = await prisma.$queryRawUnsafe<
    { club: string; pts: number; dif: number; pf: number }[]
  >(`
    WITH resultados AS (
      SELECT p.id AS partido_id, cl.nombre AS club, a."resultadoLocal" AS pf, a."resultadoVisitante" AS pc
      FROM partidos p
      JOIN actas a ON a."partidoId" = p.id
      JOIN clubes cl ON cl.id = p."clubLocalId"
      JOIN jornadas j ON j.id = p."jornadaId"
      WHERE p.estado = 'FINALIZADO' AND j.fase = 'REGULAR'
      UNION ALL
      SELECT p.id, cv.nombre, a."resultadoVisitante", a."resultadoLocal"
      FROM partidos p
      JOIN actas a ON a."partidoId" = p.id
      JOIN clubes cv ON cv.id = p."clubVisitanteId"
      JOIN jornadas j ON j.id = p."jornadaId"
      WHERE p.estado = 'FINALIZADO' AND j.fase = 'REGULAR'
    )
    SELECT club,
           SUM(CASE WHEN pf > pc THEN 2
                    WHEN partido_id = 'cmr2s5ned000jf5v4m2z0m3wo' AND pf < pc THEN 0
                    WHEN pf < pc THEN 1 ELSE 0 END)::int AS pts,
           (SUM(pf) - SUM(pc))::int AS dif,
           SUM(pf)::int AS pf
    FROM resultados GROUP BY club
    ORDER BY pts DESC, dif DESC, pf DESC
  `);
  return filas.map((f, i) => ({ pos: i + 1, club: f.club }));
}

async function main() {
  console.log(CONFIRM ? "=== MODO ESCRITURA (--confirm) ===" : "=== DRY RUN (sin --confirm, no se escribe nada) ===");

  // --- Assert 1: no existe la jornada 8
  const yaExiste = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM jornadas WHERE numero = $1`,
    JORNADA_NUMERO,
  );
  if (Number(yaExiste[0].n) > 0) throw new Error(`Ya existe la Jornada ${JORNADA_NUMERO} — abortando.`);
  console.log(`\n[OK] No existe Jornada ${JORNADA_NUMERO}.`);

  // --- Assert 2: los 8 clubes resuelven por nombre exacto
  const nombresNecesarios = [...new Set(CRUCES.flatMap((c) => [c.local, c.visitante]))];
  const clubes = await prisma.club.findMany({ where: { nombre: { in: nombresNecesarios } }, select: { id: true, nombre: true } });
  const porNombre = new Map(clubes.map((c) => [c.nombre, c.id]));
  for (const n of nombresNecesarios) {
    if (!porNombre.has(n)) throw new Error(`Club no encontrado por nombre exacto: "${n}" — abortando.`);
  }
  console.log(`[OK] Los ${nombresNecesarios.length} clubes resuelven por nombre exacto.`);

  // --- Assert 3: los cruces coinciden con la siembra real (1v8, 4v5, 2v7, 3v6)
  const siembra = await siembraFaseRegular();
  const posDe = new Map(siembra.map((s) => [s.club, s.pos]));
  console.log("\nSiembra de fase regular:");
  for (const s of siembra) console.log(`  #${s.pos} ${s.club}`);

  const esperados = [
    [3, 6],
    [4, 5],
    [2, 7],
    [1, 8],
  ];
  CRUCES.forEach((c, i) => {
    const pl = posDe.get(c.local);
    const pv = posDe.get(c.visitante);
    const [el, ev] = esperados[i];
    if (pl !== el || pv !== ev) {
      throw new Error(
        `Cruce ${i + 1} no coincide con la siembra: ${c.local}(#${pl}) vs ${c.visitante}(#${pv}), se esperaba #${el} vs #${ev}. La tabla cambió — abortando para no crear un bracket que no bindea.`,
      );
    }
  });
  console.log("[OK] Los 4 cruces coinciden con la siembra (1v8, 4v5, 2v7, 3v6).");

  // --- Assert 4: la hora en Chile es la esperada (detecta el error de DST)
  for (const c of CRUCES) {
    const real = horaChileFormatter.format(new Date(c.fechaHoraUtc));
    if (real !== c.horaChile) {
      throw new Error(`Hora incorrecta para ${c.local}: se esperaba ${c.horaChile} en Chile y da ${real} — abortando.`);
    }
  }
  const dia = diaChileFormatter.format(new Date(CRUCES[0].fechaHoraUtc));
  console.log(`[OK] Las 4 horas dan exactas en America/Santiago (${dia}).`);

  console.log("\nA crear:");
  console.log(`  Jornada ${JORNADA_NUMERO} "${JORNADA_NOMBRE}" — fase PLAYOFFS — fecha ${JORNADA_FECHA}`);
  for (const c of CRUCES) {
    console.log(`  ${c.horaChile}  ${c.local} (#${posDe.get(c.local)})  vs  ${c.visitante} (#${posDe.get(c.visitante)})  [PROGRAMADO]`);
  }

  if (!CONFIRM) {
    console.log("\nDry-run completo. Nada escrito. Volver a correr con --confirm para aplicar.");
    await prisma.$disconnect();
    return;
  }

  const jornadaId = nuevoId();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO jornadas (id, numero, fecha, nombre, fase, "createdAt") VALUES ($1, $2, $3::timestamptz, $4, 'PLAYOFFS', now())`,
      jornadaId,
      JORNADA_NUMERO,
      JORNADA_FECHA,
      JORNADA_NOMBRE,
    );
    for (const c of CRUCES) {
      await tx.$executeRawUnsafe(
        `INSERT INTO partidos (id, "jornadaId", "clubLocalId", "clubVisitanteId", "fechaHora", cancha, estado,
                               "cuartoActual", "duracionCuartoMinutos", "relojEstado", "relojRestanteSegundos",
                               "relojUltimoInicio", "mesaOperadorId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::timestamptz, NULL, 'PROGRAMADO', 0, 10, 'PAUSADO', NULL, NULL, NULL, now(), now())`,
        nuevoId(),
        jornadaId,
        porNombre.get(c.local)!,
        porNombre.get(c.visitante)!,
        c.fechaHoraUtc,
      );
    }
  });

  console.log("\nEscrito OK.");

  const verif = await prisma.$queryRawUnsafe<any[]>(`
    SELECT j.numero, j.nombre, j.fase::text AS fase,
           to_char(p."fechaHora" AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI') AS hora_chile,
           cl.nombre AS local, cv.nombre AS visitante, p.estado::text AS estado
    FROM partidos p
    JOIN jornadas j ON j.id = p."jornadaId"
    JOIN clubes cl ON cl.id = p."clubLocalId"
    JOIN clubes cv ON cv.id = p."clubVisitanteId"
    WHERE j.numero = 8 ORDER BY p."fechaHora"
  `);
  console.log("\nVerificación desde la base:");
  for (const v of verif) {
    console.log(`  [${v.fase}] ${v.hora_chile}  ${v.local} vs ${v.visitante}  (${v.estado})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exitCode = 1;
});
