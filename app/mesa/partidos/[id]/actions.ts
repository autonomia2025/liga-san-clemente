"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { TipoEvento } from "@/generated/prisma/client";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";

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

  // 4 updateMany en vez de un update por convocado: evita que la transacción
  // expire contra Supabase remoto cuando hay muchos convocados (timeout por
  // defecto de Prisma en $transaction es 5s, y N updates individuales por
  // round-trip lo superan fácil).
  await prisma.$transaction([
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubLocalId, presente: true },
      data: { titular: false, enCancha: false },
    }),
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubVisitanteId, presente: true },
      data: { titular: false, enCancha: false },
    }),
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubLocalId, jugadorId: { in: titularesLocal } },
      data: { titular: true, enCancha: true },
    }),
    prisma.partidoJugador.updateMany({
      where: {
        partidoId,
        clubId: partido.clubVisitanteId,
        jugadorId: { in: titularesVisitante },
      },
      data: { titular: true, enCancha: true },
    }),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=titulares`);
}

export async function controlarCuarto(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const accion = String(formData.get("accion") ?? "");
  const cuarto = Number(formData.get("cuarto") ?? "");

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
    fail("No podés controlar los cuartos de este partido.");
    return;
  }

  if ((accion !== "iniciar" && accion !== "finalizar") || !Number.isInteger(cuarto)) {
    fail("Acción de cuarto inválida.");
    return;
  }

  // Se recalcula el estado desde los eventos justo antes de escribir (no se
  // confía en lo que mandó el form) — evita iniciar/finalizar dos veces o
  // saltear cuartos si la pantalla quedó desactualizada.
  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true },
  });
  const estado = buildLiveMatchState(eventos);

  if (
    !estado.proximaAccionCuarto ||
    estado.proximaAccionCuarto.tipo !== accion ||
    estado.proximaAccionCuarto.cuarto !== cuarto
  ) {
    fail("Esa acción de cuarto ya no está disponible — la pantalla quedó desactualizada, recargá.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto,
      tipo: accion === "iniciar" ? TipoEvento.INICIO_CUARTO : TipoEvento.FIN_CUARTO,
    },
  });

  if (accion === "iniciar") {
    await prisma.partido.update({
      where: { id: partidoId },
      data: { cuartoActual: cuarto },
    });
  }

  redirect(`/mesa/partidos/${partidoId}?ok=cuarto`);
}
