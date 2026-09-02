// Fase de la competencia — módulo central del corte "fase regular / playoffs".
//
// Es puro a propósito (sin importar prisma, igual que scoring-merge.ts): se
// puede probar con datos sintéticos sin DATABASE_URL, y evita ciclos de
// importación entre los loaders que lo usan.
//
// Antes de esto la fase se deducía del nombre de la jornada en dos variantes
// inconsistentes repartidas por el código (`nombre === null` en un lado,
// match por substring en otro). Ahora `Jornada.fase` es una columna real y
// esta es la única capa que traduce esa columna a filtros de Prisma.

// Espeja el enum FaseCompeticion del schema. Se declara acá en vez de
// reexportar el de @/generated/prisma/client para que este módulo siga siendo
// puro y no arrastre el cliente generado a componentes de UI.
export type Fase = "REGULAR" | "PLAYOFFS";

// Lo que puede pedir quien consulta: una fase puntual, o el acumulado de
// ambas. "TOTAL" no es un valor de la base — significa "no filtrar".
export type FaseFiltro = Fase | "TOTAL";

// La tabla de posiciones NO admite "PLAYOFFS": una tabla de eliminación
// directa (pj=1, pts=2) es un artefacto sin sentido deportivo. Se excluye a
// nivel de tipos para que ni siquiera compile.
export type FaseStandings = Extract<FaseFiltro, "REGULAR" | "TOTAL">;

// Orden de las pestañas en la UI. "TOTAL" va al final pero es el default de
// los rankings (los puntos sí son aditivos entre fases).
export const FASES_UI: readonly FaseFiltro[] = ["REGULAR", "PLAYOFFS", "TOTAL"] as const;

export const FASE_LABEL: Record<FaseFiltro, string> = {
  REGULAR: "Fase Regular",
  PLAYOFFS: "Playoffs",
  TOTAL: "Total",
};

// Label corto para chips y espacios apretados (mobile).
export const FASE_LABEL_CORTO: Record<FaseFiltro, string> = {
  REGULAR: "Regular",
  PLAYOFFS: "Playoffs",
  TOTAL: "Total",
};

export const FASE_SLUG: Record<FaseFiltro, string> = {
  REGULAR: "regular",
  PLAYOFFS: "playoffs",
  TOTAL: "total",
};

// Fragmento de `where` de Prisma para consultar Partido. Devuelve un objeto
// vacío para TOTAL — no agrega ninguna condición, en vez de tener que armar
// dos queries distintas en cada llamador.
export function whereJornadaFase(fase: FaseFiltro): { jornada?: { fase: Fase } } {
  return fase === "TOTAL" ? {} : { jornada: { fase } };
}

// Igual que el anterior pero un nivel más adentro, para tablas que cuelgan de
// Partido (JugadorPartidoStat, MatchEvent).
export function wherePartidoJornadaFase(fase: FaseFiltro): { partido?: { jornada: { fase: Fase } } } {
  return fase === "TOTAL" ? {} : { partido: { jornada: { fase } } };
}

// Lee el ?fase= de la URL. Tolera basura y mayúsculas/minúsculas: cualquier
// valor no reconocido cae al fallback en vez de romper la página. El fallback
// es explícito por página porque no todas comparten el mismo default.
export function parseFaseParam(valor: string | string[] | undefined, fallback: FaseFiltro): FaseFiltro {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  if (!crudo) return fallback;
  const normalizado = crudo.trim().toLowerCase();
  const encontrada = FASES_UI.find((f) => FASE_SLUG[f] === normalizado);
  return encontrada ?? fallback;
}
