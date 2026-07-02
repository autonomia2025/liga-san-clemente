// Solo valida la forma (NN.NNN.NNN-D), no el dígito verificador.
export function isValidRutFormat(rut: string): boolean {
  return /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut);
}

// Nunca se debe mostrar el RUT completo en listados/UI — solo los últimos
// caracteres, suficiente para que el Admin lo reconozca sin exponerlo.
export function maskRut(rut: string): string {
  return rut.length > 2 ? `${"*".repeat(rut.length - 2)}${rut.slice(-2)}` : rut;
}
