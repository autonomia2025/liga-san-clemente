"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";

const MAX_CONVOCADOS = 12;

export async function guardarConvocados(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const localIds = formData.getAll("convocadosLocal").map(String);
  const visitanteIds = formData.getAll("convocadosVisitante").map(String);

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.rol !== "MESA") {
    fail("Sesión inválida.");
    return;
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) {
    fail("Partido no encontrado.");
    return;
  }
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés editar los convocados de este partido.");
    return;
  }

  if (localIds.length > MAX_CONVOCADOS) {
    fail(`Máximo ${MAX_CONVOCADOS} convocados para el equipo local.`);
    return;
  }
  if (visitanteIds.length > MAX_CONVOCADOS) {
    fail(`Máximo ${MAX_CONVOCADOS} convocados para el equipo visitante.`);
    return;
  }

  const [localValidos, visitanteValidos] = await Promise.all([
    prisma.jugador.count({ where: { id: { in: localIds }, clubId: partido.clubLocalId } }),
    prisma.jugador.count({
      where: { id: { in: visitanteIds }, clubId: partido.clubVisitanteId },
    }),
  ]);
  if (localValidos !== localIds.length) {
    fail("Hay jugadores seleccionados que no pertenecen al club local.");
    return;
  }
  if (visitanteValidos !== visitanteIds.length) {
    fail("Hay jugadores seleccionados que no pertenecen al club visitante.");
    return;
  }

  const seleccionados = new Set([...localIds, ...visitanteIds]);
  const existentes = await prisma.partidoJugador.findMany({ where: { partidoId } });

  await prisma.$transaction([
    ...localIds.map((jugadorId) =>
      prisma.partidoJugador.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: { presente: true },
        create: { partidoId, jugadorId, clubId: partido.clubLocalId, presente: true },
      }),
    ),
    ...visitanteIds.map((jugadorId) =>
      prisma.partidoJugador.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: { presente: true },
        create: { partidoId, jugadorId, clubId: partido.clubVisitanteId, presente: true },
      }),
    ),
    // Jugadores que estaban convocados y ya no: se desmarcan sin borrar la
    // fila (conserva historial de la jornada, "de forma controlada").
    ...existentes
      .filter((pj) => !seleccionados.has(pj.jugadorId))
      .map((pj) =>
        prisma.partidoJugador.update({
          where: { id: pj.id },
          data: { presente: false, titular: false, enCancha: false },
        }),
      ),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=convocados`);
}

const TITULARES_POR_EQUIPO = 5;

export async function guardarTitulares(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const titularesLocal = formData.getAll("titularesLocal").map(String);
  const titularesVisitante = formData.getAll("titularesVisitante").map(String);

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.rol !== "MESA") {
    fail("Sesión inválida.");
    return;
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) {
    fail("Partido no encontrado.");
    return;
  }
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés editar los titulares de este partido.");
    return;
  }

  if (titularesLocal.length !== TITULARES_POR_EQUIPO) {
    fail(`El equipo local debe tener exactamente ${TITULARES_POR_EQUIPO} titulares.`);
    return;
  }
  if (titularesVisitante.length !== TITULARES_POR_EQUIPO) {
    fail(`El equipo visitante debe tener exactamente ${TITULARES_POR_EQUIPO} titulares.`);
    return;
  }

  const convocados = await prisma.partidoJugador.findMany({
    where: { partidoId, presente: true },
  });
  const convocadosLocalIds = new Set(
    convocados.filter((c) => c.clubId === partido.clubLocalId).map((c) => c.jugadorId),
  );
  const convocadosVisitanteIds = new Set(
    convocados.filter((c) => c.clubId === partido.clubVisitanteId).map((c) => c.jugadorId),
  );

  if (!titularesLocal.every((jugadorId) => convocadosLocalIds.has(jugadorId))) {
    fail("Hay titulares locales que no están entre los convocados.");
    return;
  }
  if (!titularesVisitante.every((jugadorId) => convocadosVisitanteIds.has(jugadorId))) {
    fail("Hay titulares visitantes que no están entre los convocados.");
    return;
  }

  const titularesSeleccionados = new Set([...titularesLocal, ...titularesVisitante]);

  await prisma.$transaction(
    convocados.map((c) =>
      prisma.partidoJugador.update({
        where: { id: c.id },
        data: titularesSeleccionados.has(c.jugadorId)
          ? { titular: true, enCancha: true }
          : { titular: false, enCancha: false },
      }),
    ),
  );

  redirect(`/mesa/partidos/${partidoId}?ok=titulares`);
}
