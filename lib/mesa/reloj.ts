// Cronómetro del partido — la DB es la fuente de verdad (Partido.relojEstado
// / relojRestanteSegundos / relojUltimoInicio), no el cliente. Este helper
// puro calcula el tiempo restante REAL en el momento exacto en que se llama,
// usando la hora del servidor — así sobrevive redirects, refresh, cambio de
// pestaña: no importa cuándo se lea, siempre se recalcula desde la base.
//
// NOTA sobre el cliente Prisma generado: `npx prisma generate` no corre en
// este entorno de desarrollo (el CLI de Prisma se cuelga acá — probado
// exhaustivamente: --version, --help, generate, migrate status/dev, con y
// sin TTY, binario nativo invocado directo sí funciona instantáneo, así que
// no es la DB ni el motor, es el arranque del CLI de JS específicamente en
// este sandbox). La migración SQL de estos 3 campos ya está aplicada en la
// base real (prisma/migrations/20260707205838_add_persistent_game_clock) y
// verificada, pero generated/prisma/client todavía no los conoce. Por eso
// lib/mesa/reloj-db.ts lee/escribe estos 3 campos con SQL crudo
// ($queryRawUnsafe/$executeRawUnsafe) en vez del API tipado normal — el
// resto de Partido (estado, cuartoActual, clubLocalId, etc.) sigue usando el
// cliente tipado de siempre, sin cambios. Vercel corre `prisma generate` solo
// en cada deploy (postinstall), así que ahí el cliente se regenera bien —
// esto no bloquea nada, solo significa que estos 3 campos usan SQL crudo en
// vez de estar tipados, hasta que alguien corra `prisma generate` en un
// entorno donde el CLI funcione.

export type EstadoReloj = "PAUSADO" | "CORRIENDO";

export type RelojDbFields = {
  relojEstado: EstadoReloj;
  relojRestanteSegundos: number | null;
  relojUltimoInicio: Date | null;
};

export type EstadoRelojCalculado = {
  estado: EstadoReloj;
  remainingSeconds: number;
  clockLabel: string;
};

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function calcularRelojActual(
  partido: RelojDbFields & { duracionCuartoMinutos: number },
  now: Date = new Date(),
): EstadoRelojCalculado {
  const duracion = (partido.duracionCuartoMinutos || 10) * 60;
  const base = partido.relojRestanteSegundos ?? duracion;

  if (partido.relojEstado !== "CORRIENDO" || !partido.relojUltimoInicio) {
    return { estado: "PAUSADO", remainingSeconds: base, clockLabel: formatClock(base) };
  }

  const elapsed = Math.floor((now.getTime() - partido.relojUltimoInicio.getTime()) / 1000);
  const remaining = Math.max(0, base - elapsed);

  return {
    estado: remaining === 0 ? "PAUSADO" : "CORRIENDO",
    remainingSeconds: remaining,
    clockLabel: formatClock(remaining),
  };
}
