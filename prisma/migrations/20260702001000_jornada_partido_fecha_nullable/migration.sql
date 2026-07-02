-- AlterTable: el fixture real importado no siempre trae fecha definida.
-- No se debe inventar una fecha — se completa después desde Admin.
ALTER TABLE "jornadas" ALTER COLUMN "fecha" DROP NOT NULL;

-- AlterTable: mismo motivo para el partido.
ALTER TABLE "partidos" ALTER COLUMN "fechaHora" DROP NOT NULL;
