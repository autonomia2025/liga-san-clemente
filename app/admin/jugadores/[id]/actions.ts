"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function updateJugador(formData: FormData) {
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const clubId = String(formData.get("clubId") ?? "");
  const numeroCamisetaRaw = String(formData.get("numeroCamiseta") ?? "").trim();
  const fotoUrlRaw = String(formData.get("fotoUrl") ?? "").trim();

  const fail = (mensaje: string) =>
    redirect(`/admin/jugadores/${jugadorId}?error=${encodeURIComponent(mensaje)}`);

  if (!nombre) fail("El nombre no puede estar vacío.");
  if (!clubId) fail("Falta seleccionar un club.");

  let numeroCamiseta: number | null = null;
  if (numeroCamisetaRaw.length > 0) {
    const n = Number(numeroCamisetaRaw);
    if (!Number.isInteger(n) || n < 0) {
      fail("El número de camiseta debe ser un entero mayor o igual a 0.");
    }
    numeroCamiseta = n;
  }

  const fotoUrl = fotoUrlRaw.length > 0 ? fotoUrlRaw : null;

  try {
    await prisma.jugador.update({
      where: { id: jugadorId },
      data: { nombre, clubId, numeroCamiseta, fotoUrl },
    });
  } catch (error) {
    const isDuplicateNumero =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    fail(
      isDuplicateNumero
        ? `Ya existe un jugador con el número ${numeroCamiseta} en ese club.`
        : "No se pudo guardar el jugador.",
    );
    return;
  }

  redirect(`/admin/jugadores/${jugadorId}?ok=1`);
}
