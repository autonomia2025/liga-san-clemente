-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MESA');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('PROGRAMADO', 'CONFIRMADO', 'EN_CURSO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('PUNTO', 'FALTA', 'TIMEOUT', 'SUSTITUCION', 'POSESION', 'INICIO_CUARTO', 'FIN_CUARTO', 'FIN_PARTIDO');

-- CreateEnum
CREATE TYPE "TipoFalta" AS ENUM ('PERSONAL', 'TECNICA', 'ANTIDEPORTIVA', 'DESCALIFICANTE', 'EXPULSION_DIRECTA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "escudoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugadores" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroCamiseta" INTEGER NOT NULL,
    "fotoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidos" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "clubLocalId" TEXT NOT NULL,
    "clubVisitanteId" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "cancha" TEXT,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'PROGRAMADO',
    "cuartoActual" INTEGER NOT NULL DEFAULT 0,
    "duracionCuartoMinutos" INTEGER NOT NULL DEFAULT 10,
    "mesaOperadorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partido_jugadores" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "titular" BOOLEAN NOT NULL DEFAULT false,
    "enCancha" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "partido_jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "cuarto" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "jugadorId" TEXT,
    "clubId" TEXT,
    "detalle" JSONB,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "anuladoPorId" TEXT,
    "anuladoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actas" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "generadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultadoLocal" INTEGER NOT NULL,
    "resultadoVisitante" INTEGER NOT NULL,
    "mvpJugadorId" TEXT,
    "observacionesMesa" TEXT,

    CONSTRAINT "actas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_arbitrales" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT false,
    "texto" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informes_arbitrales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_supabaseUserId_key" ON "usuarios"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clubes_nombre_key" ON "clubes"("nombre");

-- CreateIndex
CREATE INDEX "jugadores_clubId_idx" ON "jugadores"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "jugadores_clubId_numeroCamiseta_key" ON "jugadores"("clubId", "numeroCamiseta");

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_numero_key" ON "jornadas"("numero");

-- CreateIndex
CREATE INDEX "partidos_jornadaId_idx" ON "partidos"("jornadaId");

-- CreateIndex
CREATE INDEX "partido_jugadores_partidoId_idx" ON "partido_jugadores"("partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "partido_jugadores_partidoId_jugadorId_key" ON "partido_jugadores"("partidoId", "jugadorId");

-- CreateIndex
CREATE INDEX "match_events_partidoId_idx" ON "match_events"("partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "actas_partidoId_key" ON "actas"("partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "informes_arbitrales_partidoId_key" ON "informes_arbitrales"("partidoId");

-- AddForeignKey
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_clubLocalId_fkey" FOREIGN KEY ("clubLocalId") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_clubVisitanteId_fkey" FOREIGN KEY ("clubVisitanteId") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_mesaOperadorId_fkey" FOREIGN KEY ("mesaOperadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido_jugadores" ADD CONSTRAINT "partido_jugadores_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido_jugadores" ADD CONSTRAINT "partido_jugadores_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "jugadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partido_jugadores" ADD CONSTRAINT "partido_jugadores_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "jugadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actas" ADD CONSTRAINT "actas_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actas" ADD CONSTRAINT "actas_mvpJugadorId_fkey" FOREIGN KEY ("mvpJugadorId") REFERENCES "jugadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_arbitrales" ADD CONSTRAINT "informes_arbitrales_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_arbitrales" ADD CONSTRAINT "informes_arbitrales_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

