// Formateo de fechas/horarios de jornadas y partidos.
//
// Ojo, las dos funciones usan timezone distinto a propósito — no es un
// error de copy-paste:
//
// - Jornada.fecha es un campo "solo fecha" (sin hora) que se guarda como
//   medianoche UTC del día que representa (ver scripts/update-fixture-fechas.ts).
//   Formatearlo con America/Santiago lo corre un día para atrás (medianoche
//   UTC del 5 de julio es 4 de julio 20:00 en Chile). Hay que formatearlo en
//   UTC — así se lee el mismo día calendario que se guardó, sin conversión.
// - Partido.fechaHora es un instante real (hora de partido convertida a UTC
//   con el offset de Chile ya aplicado al guardar). Ese sí hay que mostrarlo
//   convertido a America/Santiago para que aparezca la hora real de Chile
//   (15:00 Chile se guarda como 19:00 UTC; mostrarlo en UTC diría "19:00",
//   que es la hora incorrecta para alguien mirando la app desde Chile).
const LOCALE = "es-CL";

export function formatFechaCL(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString(LOCALE, { timeZone: "UTC" });
}

export function formatFechaHoraCL(fecha: Date | string): string {
  return new Date(fecha).toLocaleString(LOCALE, { timeZone: "America/Santiago" });
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "dom, 05 jul" (formato combinado de Intl, con coma y en minúscula) no sirve
// para las cards compactas de la landing — se arma a mano a partir de tokens
// sueltos para controlar el resultado exacto: "Dom 05 Jul" (sin coma, con
// mayúscula, sin punto en el mes abreviado).
function formatFechaCorta(fecha: Date | string, timeZone: "UTC" | "America/Santiago"): string {
  const d = new Date(fecha);
  const weekday = capitalizar(d.toLocaleDateString(LOCALE, { timeZone, weekday: "short" }));
  const day = d.toLocaleDateString(LOCALE, { timeZone, day: "2-digit" });
  const month = capitalizar(d.toLocaleDateString(LOCALE, { timeZone, month: "short" })).replace(/\.$/, "");
  return `${weekday} ${day} ${month}`;
}

// Fecha corta de Jornada.fecha (solo fecha, UTC) — ej. "Dom 05 Jul".
export function formatFechaCortaCL(fecha: Date | string): string {
  return formatFechaCorta(fecha, "UTC");
}

// Hora corta de Partido.fechaHora (instante real, Chile), sin segundos, 24h.
export function formatHoraCortaCL(fecha: Date | string): string {
  return new Date(fecha).toLocaleTimeString(LOCALE, {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Fecha + hora corta de Partido.fechaHora — ej. "Dom 05 Jul · 15:00".
export function formatFechaHoraCortaCL(fecha: Date | string): string {
  return `${formatFechaCorta(fecha, "America/Santiago")} · ${formatHoraCortaCL(fecha)}`;
}
