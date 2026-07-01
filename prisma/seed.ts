// Seed mínimo de desarrollo: 2 clubes, algunos jugadores por club,
// 1 jornada y 1 partido programado. Pensado para probar el flujo de
// Admin/Mesa/Público con datos de prueba, no datos reales de la liga
// (eso se hace en Fase 1 vía importación).
//
// Seguro de correr más de una vez: usa upsert sobre las claves únicas
// del schema (nombre de club, numeroCamiseta por club, numero de jornada)
// y no duplica el partido de prueba si ya existe.
import { prisma } from "../lib/db";

async function main() {
  const clubLocal = await prisma.club.upsert({
    where: { nombre: "Halcones CABB" },
    update: {},
    create: { nombre: "Halcones CABB" },
  });

  const clubVisitante = await prisma.club.upsert({
    where: { nombre: "Tiburones del Sur" },
    update: {},
    create: { nombre: "Tiburones del Sur" },
  });

  const jugadoresLocal = [
    { nombre: "Juan Pérez", numeroCamiseta: 4 },
    { nombre: "Martín Gómez", numeroCamiseta: 5 },
    { nombre: "Lucas Fernández", numeroCamiseta: 6 },
    { nombre: "Diego Sosa", numeroCamiseta: 7 },
  ];

  const jugadoresVisitante = [
    { nombre: "Federico López", numeroCamiseta: 4 },
    { nombre: "Tomás Romero", numeroCamiseta: 5 },
    { nombre: "Agustín Torres", numeroCamiseta: 6 },
    { nombre: "Franco Molina", numeroCamiseta: 7 },
  ];

  for (const jugador of jugadoresLocal) {
    await prisma.jugador.upsert({
      where: {
        clubId_numeroCamiseta: {
          clubId: clubLocal.id,
          numeroCamiseta: jugador.numeroCamiseta,
        },
      },
      update: {},
      create: { ...jugador, clubId: clubLocal.id },
    });
  }

  for (const jugador of jugadoresVisitante) {
    await prisma.jugador.upsert({
      where: {
        clubId_numeroCamiseta: {
          clubId: clubVisitante.id,
          numeroCamiseta: jugador.numeroCamiseta,
        },
      },
      update: {},
      create: { ...jugador, clubId: clubVisitante.id },
    });
  }

  const jornada = await prisma.jornada.upsert({
    where: { numero: 1 },
    update: {},
    create: {
      numero: 1,
      fecha: new Date("2026-08-01T00:00:00.000Z"),
      nombre: "Jornada 1",
    },
  });

  const partidoExistente = await prisma.partido.findFirst({
    where: {
      jornadaId: jornada.id,
      clubLocalId: clubLocal.id,
      clubVisitanteId: clubVisitante.id,
    },
  });

  if (!partidoExistente) {
    await prisma.partido.create({
      data: {
        jornadaId: jornada.id,
        clubLocalId: clubLocal.id,
        clubVisitanteId: clubVisitante.id,
        fechaHora: new Date("2026-08-01T18:00:00.000Z"),
        cancha: "Estadio Municipal",
      },
    });
  }

  console.log("Seed completado: 2 clubes, jugadores, 1 jornada, 1 partido programado.");
}

main()
  .catch((error) => {
    console.error("Error al correr el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
