import { prisma } from "@/lib/db";
import type { EstadoReloj, RelojDbFields } from "./reloj";

// Lee/escribe los 3 campos del reloj con SQL crudo (ver nota extensa en
// reloj.ts sobre por qué — el cliente Prisma generado en este entorno
// todavía no los conoce). Nunca se usa para el resto de Partido, que sigue
// con el cliente tipado normal en actions.ts/page.tsx.

export async function leerReloj(
  partidoId: string,
): Promise<(RelojDbFields & { duracionCuartoMinutos: number }) | null> {
  const rows = await prisma.$queryRawUnsafe<
    {
      relojEstado: EstadoReloj;
      relojRestanteSegundos: number | null;
      relojUltimoInicio: Date | null;
      duracionCuartoMinutos: number;
    }[]
  >(
    `SELECT "relojEstado", "relojRestanteSegundos", "relojUltimoInicio", "duracionCuartoMinutos" FROM "partidos" WHERE id = $1`,
    partidoId,
  );
  return rows[0] ?? null;
}

export async function escribirReloj(
  partidoId: string,
  data: { relojEstado: EstadoReloj; relojRestanteSegundos: number | null; relojUltimoInicio: Date | null },
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "partidos" SET "relojEstado" = $1::"EstadoReloj", "relojRestanteSegundos" = $2, "relojUltimoInicio" = $3 WHERE id = $4`,
    data.relojEstado,
    data.relojRestanteSegundos,
    data.relojUltimoInicio,
    partidoId,
  );
}
