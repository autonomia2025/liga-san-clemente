-- CreateEnum
CREATE TYPE "FaseCompeticion" AS ENUM ('REGULAR', 'PLAYOFFS');

-- AlterTable
ALTER TABLE "jornadas" ADD COLUMN     "fase" "FaseCompeticion" NOT NULL DEFAULT 'REGULAR';
