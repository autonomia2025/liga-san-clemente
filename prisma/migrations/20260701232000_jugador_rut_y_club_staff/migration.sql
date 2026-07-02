-- AlterTable: numeroCamiseta pasa a ser opcional (el registro oficial no siempre trae dorsal)
ALTER TABLE "jugadores" ALTER COLUMN "numeroCamiseta" DROP NOT NULL;

-- AlterTable: rut como clave natural para upsert idempotente en la importación
ALTER TABLE "jugadores" ADD COLUMN "rut" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jugadores_clubId_rut_key" ON "jugadores"("clubId", "rut");

-- CreateEnum
CREATE TYPE "CargoStaff" AS ENUM ('ENTRENADOR', 'AYUDANTE');

-- CreateTable
CREATE TABLE "club_staff" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "cargo" "CargoStaff" NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "rut" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_staff_clubId_idx" ON "club_staff"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "club_staff_clubId_rut_key" ON "club_staff"("clubId", "rut");

-- AddForeignKey
ALTER TABLE "club_staff" ADD CONSTRAINT "club_staff_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "OrigenStat" AS ENUM ('EVENTOS', 'IMPORTADO');

-- CreateTable
CREATE TABLE "jugador_partido_stats" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "faltas" INTEGER,
    "origen" "OrigenStat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jugador_partido_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jugador_partido_stats_partidoId_idx" ON "jugador_partido_stats"("partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "jugador_partido_stats_partidoId_jugadorId_key" ON "jugador_partido_stats"("partidoId", "jugadorId");

-- AddForeignKey
ALTER TABLE "jugador_partido_stats" ADD CONSTRAINT "jugador_partido_stats_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugador_partido_stats" ADD CONSTRAINT "jugador_partido_stats_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "jugadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jugador_partido_stats" ADD CONSTRAINT "jugador_partido_stats_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
