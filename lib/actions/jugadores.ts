"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

// Acciones de Jugador reutilizadas desde /admin/clubes/[id]/jugadores (nómina
// por club) y desde /admin/jugadores/[id] (edición completa) — por eso todas
// reciben un "returnTo" del formulario en vez de tener una redirección fija.
function safeReturnTo(raw: FormDataEntryValue | null, fallback: string): string {
  const s = String(raw ?? "");
  return s.startsWith("/admin/") ? s : fallback;
}

function isDuplicateNumero(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function parseNumeroCamiseta(raw: string, fail: (mensaje: string) => never): number | null {
  if (raw.length === 0) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 99) {
    fail("El número de camiseta debe ser un entero entre 0 y 99.");
  }
  return n;
}

export async function createJugador(formData: FormData) {
  const clubId = String(formData.get("clubId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const numeroCamisetaRaw = String(formData.get("numeroCamiseta") ?? "").trim();
  const returnTo = safeReturnTo(formData.get("returnTo"), `/admin/clubes/${clubId}/jugadores`);

  const fail = (mensaje: string): never => redirect(`${returnTo}?error=${encodeURIComponent(mensaje)}`);

  if (!clubId) fail("Falta el club.");
  if (!nombre) fail("El nombre no puede estar vacío.");

  const numeroCamiseta = parseNumeroCamiseta(numeroCamisetaRaw, fail);

  try {
    await prisma.jugador.create({
      data: { clubId, nombre, numeroCamiseta, activo: true },
    });
  } catch (error) {
    fail(
      isDuplicateNumero(error)
        ? `Ya existe un jugador con el número ${numeroCamiseta} en ese club.`
        : "No se pudo crear el jugador.",
    );
  }

  redirect(`${returnTo}?ok=creado`);
}

// Edición rápida del número desde la fila de la nómina (sin pasar por el
// formulario completo de /admin/jugadores/[id]) — pensada para renumerar
// varios jugadores seguidos antes de un partido.
export async function updateNumeroCamiseta(formData: FormData) {
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const numeroCamisetaRaw = String(formData.get("numeroCamiseta") ?? "").trim();
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/jugadores");

  const fail = (mensaje: string): never => redirect(`${returnTo}?error=${encodeURIComponent(mensaje)}`);

  const numeroCamiseta = parseNumeroCamiseta(numeroCamisetaRaw, fail);

  try {
    await prisma.jugador.update({ where: { id: jugadorId }, data: { numeroCamiseta } });
  } catch (error) {
    fail(
      isDuplicateNumero(error)
        ? `Ya existe un jugador con el número ${numeroCamiseta} en ese club.`
        : "No se pudo actualizar el número.",
    );
  }

  redirect(`${returnTo}?ok=numero`);
}

export async function toggleActivoJugador(formData: FormData) {
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/jugadores");

  const jugador = await prisma.jugador.findUnique({ where: { id: jugadorId } });
  if (!jugador) redirect(`${returnTo}?error=${encodeURIComponent("Jugador no encontrado.")}`);

  await prisma.jugador.update({ where: { id: jugadorId }, data: { activo: !jugador.activo } });

  redirect(`${returnTo}?ok=estado`);
}

// Borrado físico solo si el jugador nunca apareció en un partido real — de lo
// contrario MatchEvent quedaría con jugadorId null (se pierde quién anotó/hizo
// la falta) y PartidoJugador/JugadorPartidoStat se borrarían en cascada
// (se pierde la nómina y el boxscore de partidos ya finalizados). En ese caso
// se rechaza y se sugiere desactivar en su lugar.
export async function deleteJugadorSiSePuede(formData: FormData) {
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"), "/admin/jugadores");

  const fail = (mensaje: string): never => redirect(`${returnTo}?error=${encodeURIComponent(mensaje)}`);

  const [eventos, roster, stats, actasComoMvp] = await Promise.all([
    prisma.matchEvent.count({ where: { jugadorId } }),
    prisma.partidoJugador.count({ where: { jugadorId } }),
    prisma.jugadorPartidoStat.count({ where: { jugadorId } }),
    prisma.acta.count({ where: { mvpJugadorId: jugadorId } }),
  ]);

  if (eventos > 0 || roster > 0 || stats > 0 || actasComoMvp > 0) {
    fail("Este jugador ya tiene historial de partidos o estadísticas — no se puede eliminar. Usá Desactivar en su lugar.");
  }

  await prisma.jugador.delete({ where: { id: jugadorId } });

  redirect(`${returnTo}?ok=eliminado`);
}
