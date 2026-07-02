"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { EstadoPartido } from "@/generated/prisma/client";

export async function confirmarPartido(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/admin/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    include: {
      clubLocal: { include: { _count: { select: { jugadores: true } } } },
      clubVisitante: { include: { _count: { select: { jugadores: true } } } },
    },
  });

  if (!partido) fail("Partido no encontrado.");

  if (partido!.estado === EstadoPartido.FINALIZADO) {
    fail("No se puede confirmar un partido ya finalizado.");
  }
  if (partido!.estado !== EstadoPartido.PROGRAMADO) {
    fail("El partido ya no está en estado Programado.");
  }
  if (partido!.clubLocal._count.jugadores === 0) {
    fail(`${partido!.clubLocal.nombre} no tiene jugadores cargados — no se puede confirmar.`);
  }
  if (partido!.clubVisitante._count.jugadores === 0) {
    fail(`${partido!.clubVisitante.nombre} no tiene jugadores cargados — no se puede confirmar.`);
  }

  await prisma.partido.update({
    where: { id: partidoId },
    data: { estado: EstadoPartido.CONFIRMADO },
  });

  redirect(`/admin/partidos/${partidoId}?ok=1`);
}
