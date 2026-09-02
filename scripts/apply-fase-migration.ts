// Aplica la migración add_fase_jornada manualmente vía el cliente
// de Prisma (no el CLI — el CLI de prisma se cuelga en este entorno, ver
// diagnóstico: el binario nativo funciona solo, pero el wrapper JS del CLI
// nunca responde, probado con --help, generate, migrate status, todos sin
// salida). El cliente de Prisma (usado en scripts toda la sesión) sí
// funciona bien — se usa acá para ejecutar el SQL exacto que el CLI hubiera
// generado, y se registra en _prisma_migrations para que el historial quede
// consistente con lo que haría `prisma migrate dev`.
import "dotenv/config";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { prisma } from "../lib/db";

const MIGRATION_NAME = "20260901180000_add_fase_jornada";
const SQL_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const sql = fs.readFileSync(SQL_PATH, "utf-8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");

  console.log("1. Chequeos previos (solo lectura)...");
  const tipoExiste = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FaseCompeticion') as exists`,
  );
  const columnaExiste = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jornadas' AND column_name = 'fase') as exists`,
  );
  console.log("  Enum FaseCompeticion ya existe:", tipoExiste[0].exists);
  console.log("  Columna jornadas.fase ya existe:", columnaExiste[0].exists);

  if (tipoExiste[0].exists || columnaExiste[0].exists) {
    console.error("Ya existe algo con ese nombre — abortando, no se reintenta.");
    process.exitCode = 1;
    return;
  }

  const yaRegistrada = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  );
  console.log("  Ya registrada en _prisma_migrations:", yaRegistrada.length > 0);
  if (yaRegistrada.length > 0) {
    console.error("Ya está registrada — abortando.");
    process.exitCode = 1;
    return;
  }

  console.log(`\n${CONFIRM ? "2. Aplicando" : "2. [DRY RUN] Aplicaría"} la migración...`);
  console.log(sql);
  if (!CONFIRM) {
    console.log("Nada se ejecutó. Correr con --confirm para aplicar de verdad.");
    return;
  }

  const startedAt = new Date();
  await prisma.$executeRawUnsafe(sql);
  const finishedAt = new Date();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
     VALUES ($1, $2, $3, $4, $5, 1)`,
    crypto.randomUUID(),
    checksum,
    MIGRATION_NAME,
    startedAt,
    finishedAt,
  );

  console.log("Migración aplicada y registrada en _prisma_migrations.");

  console.log("\n3. Verificación post-migración...");
  const columnas = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string; column_default: string }[]>(
    `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'jornadas' AND column_name = 'fase'`,
  );
  console.log(columnas);

  // Las 7 jornadas existentes son todas de fase regular: quedan en REGULAR por
  // el default de la columna, sin backfill separado.
  const porFase = await prisma.$queryRawUnsafe<{ fase: string; n: bigint }[]>(
    `SELECT fase::text as fase, COUNT(*) as n FROM jornadas GROUP BY fase ORDER BY fase`,
  );
  console.log("Jornadas por fase:", porFase.map((r) => `${r.fase}=${r.n}`).join(" "));
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
