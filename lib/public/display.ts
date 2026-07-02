// Nombres y abreviaturas visuales para la landing pública. Nunca se toca el
// nombre oficial en base de datos — esto es puramente presentación. Curado a
// mano contra los 8 clubes reales de la liga para evitar abreviaturas
// repetidas (ej. "CLU" para cualquier "Club ...", que era ambiguo).
const CLUB_DISPLAY: Record<string, { corto: string; abrev: string }> = {
  "C.D. PARK": { corto: "C.D. Park", abrev: "PARK" },
  "CLUB DE BASQUETBOL ALAMEDA LINARES": { corto: "Alameda Linares", abrev: "ALAM" },
  "CLUB DEPORTIVO BASKETBALL DUAO": { corto: "Duao Basketball", abrev: "DUAO" },
  "CLUB UNIVERSIDAD CATÓLICA DEL MAULE": { corto: "UCM", abrev: "UCM" },
  "CSDC JORGE MENESES MATURANA": { corto: "CSDC JMM", abrev: "JMM" },
  "JMM U19": { corto: "JMM U19", abrev: "U19" },
  "LAS AMERICAS": { corto: "Las Américas", abrev: "LAS" },
  PUMAS: { corto: "Pumas", abrev: "PUM" },
};

function tituloCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(" ");
}

// Fallback para un club fuera del mapa curado (nuevo ingreso a la liga):
// saca prefijos genéricos ("CLUB", "CLUB DEPORTIVO", "C.D.", "CSDC") antes de
// abreviar, para no repetir la misma sigla en varios clubes.
function abrevFallback(nombreOficial: string): string {
  const sinPrefijo = nombreOficial
    .replace(/^(CLUB DEPORTIVO|CLUB|C\.D\.|CSDC)\s+/i, "")
    .trim();
  const palabras = sinPrefijo.split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) {
    return palabras
      .slice(0, 4)
      .map((p) => p.charAt(0))
      .join("")
      .toUpperCase();
  }
  return (sinPrefijo || nombreOficial).slice(0, 4).toUpperCase();
}

export function clubNombreCorto(nombreOficial: string): string {
  return CLUB_DISPLAY[nombreOficial]?.corto ?? tituloCase(nombreOficial);
}

export function clubAbrev(nombreOficial: string): string {
  return CLUB_DISPLAY[nombreOficial]?.abrev ?? abrevFallback(nombreOficial);
}

// Paleta fija de acentos para avatares de club — se elige por hash estable
// del nombre, así cada club siempre cae en el mismo color entre renders y
// entre secciones (hero, tabla, equipos, etc.) sin guardar nada en DB.
const PALETA_ACENTO = [
  "from-orange-500/90 to-red-600/90",
  "from-blue-500/90 to-indigo-600/90",
  "from-emerald-500/90 to-teal-600/90",
  "from-fuchsia-500/90 to-purple-600/90",
  "from-amber-500/90 to-orange-600/90",
  "from-cyan-500/90 to-blue-600/90",
  "from-rose-500/90 to-pink-600/90",
  "from-lime-500/90 to-emerald-600/90",
] as const;

function hashEstable(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function clubAcento(nombreOficial: string): string {
  return PALETA_ACENTO[hashEstable(nombreOficial) % PALETA_ACENTO.length];
}
