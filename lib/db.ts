import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL. Copiá .env.example a .env y completá la conexión a la base de datos.",
    );
  }

  // max bajo a propósito: en Vercel cada invocación serverless puede crear su
  // propia instancia de este módulo (su propio pg.Pool). Con el default de
  // `pg` (max: 10) y varias invocaciones concurrentes, el número de
  // conexiones reales contra Supabase se dispara y se agota el límite del
  // pooler (visto en producción como EMAXCONNSESSION). DATABASE_URL en
  // producción tiene que ser el Transaction pooler de Supabase (puerto 6543,
  // multiplexa muchas conexiones de cliente sobre pocas conexiones reales) —
  // ver README, sección "Deploy en Vercel". Este límite acá es una defensa
  // adicional, no el fix principal.
  const adapter = new PrismaPg({ connectionString, max: 3 });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
