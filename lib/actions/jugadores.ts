"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Acciones de Jugador reutilizadas desde /admin/clubes/[id]/jugadores (nómina
// por club), /admin/jugadores/[id] (edición completa) y ahora también desde
// /mesa/partidos/[id] (corrección rápida de dorsal antes/durante el partido)
// — por eso todas reciben un "returnTo" del formulario en vez de tener una
// redirección fija. Solo se permiten rutas internas conocidas (nunca un host
// externo) para evitar un open-redirect si alguien manipula el form.
function safeReturnTo(raw: FormDataEntryValue | null, fallback: string): string {
  const s = String(raw ?? "");
  return s.startsWith("/admin/") || s.startsWith("/mesa/") ? s : fallback;
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

// Variante para /mesa/partidos/[id]: la fila de convocados vive dentro de un
// <form> grande (checkboxes de convocados, un solo submit para toda la
// nómina) — no se puede anidar OTRO <form> por número sin romper HTML. Esta
// versión no usa <form>/redirect: se llama directo desde un botón "use
// client" y devuelve un resultado en vez de navegar, así el operador no
// pierde los checkboxes que ya venía marcando pero todavía no guardó.
export async function updateNumeroCamisetaInline(
  jugadorId: string,
  numeroCamisetaRaw: string,
  partidoId: string,
): Promise<{ ok: true; numeroCamiseta: number | null } | { ok: false; error: string }> {
  const raw = numeroCamisetaRaw.trim();
  let numeroCamiseta: number | null = null;
  if (raw.length > 0) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      return { ok: false, error: "El número debe ser un entero entre 0 y 99." };
    }
    numeroCamiseta = n;
  }

  try {
    await prisma.jugador.update({ where: { id: jugadorId }, data: { numeroCamiseta } });
  } catch (error) {
    return {
      ok: false,
      error: isDuplicateNumero(error)
        ? `Ya existe un jugador con el número ${numeroCamiseta} en ese club.`
        : "No se pudo actualizar el número.",
    };
  }

  revalidatePath(`/mesa/partidos/${partidoId}`);
  return { ok: true, numeroCamiseta };
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
