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

// Color de identidad por club — curado a mano para los 8 clubes reales, así
// cada equipo tiene su acento propio y distintivo (avatares, badges,
// gradientes) igual que en una liga profesional. No se guarda en DB, es puro
// display. Para clubes fuera del mapa se deriva un color estable por hash.
const CLUB_COLOR: Record<string, string> = {
  "C.D. PARK": "#ff7a1a",
  "CSDC JORGE MENESES MATURANA": "#3e8cff",
  "LAS AMERICAS": "#9b6bff",
  PUMAS: "#f5a623",
  "CLUB DEPORTIVO BASKETBALL DUAO": "#22d3ee",
  "CLUB UNIVERSIDAD CATÓLICA DEL MAULE": "#6d7bff",
  "CLUB DE BASQUETBOL ALAMEDA LINARES": "#2dd4bf",
  "JMM U19": "#7a8496",
};

const PALETA_FALLBACK = [
  "#ff7a1a",
  "#3e8cff",
  "#9b6bff",
  "#f5a623",
  "#22d3ee",
  "#6d7bff",
  "#2dd4bf",
  "#e2506b",
];

function hashEstable(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Color base del club (hex). Se usa para armar el gradiente del avatar con
// color-mix en el componente.
export function clubColor(nombreOficial: string): string {
  return CLUB_COLOR[nombreOficial] ?? PALETA_FALLBACK[hashEstable(nombreOficial) % PALETA_FALLBACK.length];
}

// Gradiente listo para usar en `background` (inline style) del avatar de club.
export function clubGradient(nombreOficial: string): string {
  const c = clubColor(nombreOficial);
  return `linear-gradient(155deg, ${c}, color-mix(in srgb, ${c} 42%, #05070a))`;
}
