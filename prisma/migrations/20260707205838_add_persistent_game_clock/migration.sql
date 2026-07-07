-- CreateEnum
CREATE TYPE "EstadoReloj" AS ENUM ('PAUSADO', 'CORRIENDO');

-- AlterTable
ALTER TABLE "partidos" ADD COLUMN     "relojEstado" "EstadoReloj" NOT NULL DEFAULT 'PAUSADO',
ADD COLUMN     "relojRestanteSegundos" INTEGER,
ADD COLUMN     "relojUltimoInicio" TIMESTAMP(3);
