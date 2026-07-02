"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { EstadoPartido } from "@/generated/prisma/client";

export async function abrirPartido(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa?error=${encodeURIComponent(mensaje)}`);

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

  if (partido.estado === EstadoPartido.FINALIZADO) {
    fail("No se puede abrir un partido ya finalizado.");
    return;
  }

  if (partido.estado === EstadoPartido.PROGRAMADO) {
    fail("El partido debe estar confirmado por el Admin antes de abrirse.");
    return;
  }

  if (partido.estado === EstadoPartido.EN_CURSO) {
    if (partido.mesaOperadorId === usuario.id) {
      // El mismo operador reingresa: no se toca nada, solo se lo deja pasar.
      redirect(`/mesa/partidos/${partido.id}`);
    }
    fail("Este partido ya está siendo operado por otro usuario de Mesa.");
    return;
  }

  // Acá el partido está CONFIRMADO: única transición válida para abrir.
  // updateMany con el estado en el where hace el check-and-set atómico —
  // si dos operadores abren casi al mismo tiempo, solo uno gana la carrera.
  const { count } = await prisma.partido.updateMany({
    where: { id: partido.id, estado: EstadoPartido.CONFIRMADO },
    data: { estado: EstadoPartido.EN_CURSO, mesaOperadorId: usuario.id },
  });

  if (count === 0) {
    fail("Este partido ya no está disponible para abrir — puede que otro operador lo haya tomado recién.");
    return;
  }

  redirect(`/mesa/partidos/${partido.id}`);
}
