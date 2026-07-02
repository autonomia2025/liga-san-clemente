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
