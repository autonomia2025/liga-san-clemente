import { prisma } from "@/lib/db";

// Estado de la temporada: en qué momento del año está la liga. Es lo que le
// permite a la Home cambiar de "modo fase regular" a "modo playoffs" sola,
// sin ningún flag hardcodeado que haya que acordarse de apagar.
//
// A propósito NO importa playoffs-data.ts: ese módulo importa standings, que
// importa fase — meterlo acá crearía un ciclo. Lo único que necesita saber
// esta capa es si existe una fase de playoffs y si está en marcha; el detalle
// del bracket (y el campeón) lo aporta getPlayoffsData() por separado.

export type SeasonStageState = "done" | "current" | "pending";

export type SeasonStage = {
  key: "regular" | "playoffs" | "campeon";
  label: string;
  state: SeasonStageState;
  // Texto corto de apoyo: "7 fechas jugadas", "Cuartos de final", etc.
  detail: string | null;
};

export type SeasonPhaseState = {
  regularCompleta: boolean;
  playoffsExisten: boolean;
  playoffsEnCurso: boolean;
  playoffsTerminados: boolean;
  // Lo que consume la Home para decidir qué hero mostrar.
  modoHome: "regular" | "playoffs";
  stages: SeasonStage[];
};

export async function getSeasonPhaseState(): Promise<SeasonPhaseState> {
  const [regularTotal, regularPendientes, playoffsTotal, playoffsFinalizados, jornadasRegularConPartidos] =
    await Promise.all([
      prisma.partido.count({ where: { jornada: { fase: "REGULAR" } } }),
      prisma.partido.count({ where: { jornada: { fase: "REGULAR" }, estado: { not: "FINALIZADO" } } }),
      prisma.partido.count({ where: { jornada: { fase: "PLAYOFFS" } } }),
      prisma.partido.count({ where: { jornada: { fase: "PLAYOFFS" }, estado: "FINALIZADO" } }),
      prisma.jornada.count({ where: { fase: "REGULAR", partidos: { some: {} } } }),
    ]);

  const regularCompleta = regularTotal > 0 && regularPendientes === 0;
  const playoffsExisten = playoffsTotal > 0;
  const playoffsTerminados = playoffsExisten && playoffsFinalizados === playoffsTotal;
  const playoffsEnCurso = playoffsExisten && !playoffsTerminados;

  // El modo playoffs se enciende con la sola existencia de partidos de
  // playoffs cargados — no hace falta esperar a que se juegue el primero.
  // Eso es lo que hace que el sitio anuncie los cruces con anticipación.
  const modoHome: SeasonPhaseState["modoHome"] = playoffsExisten ? "playoffs" : "regular";

  const stages: SeasonStage[] = [
    {
      key: "regular",
      label: "Fase Regular",
      state: regularCompleta ? "done" : "current",
      detail:
        jornadasRegularConPartidos > 0
          ? `${jornadasRegularConPartidos} fecha${jornadasRegularConPartidos === 1 ? "" : "s"}`
          : null,
    },
    {
      key: "playoffs",
      label: "Playoffs",
      state: playoffsTerminados ? "done" : playoffsExisten ? "current" : "pending",
      detail: playoffsExisten
        ? `${playoffsFinalizados}/${playoffsTotal} partidos`
        : regularCompleta
          ? "Por comenzar"
          : null,
    },
    {
      key: "campeon",
      label: "Campeón",
      state: playoffsTerminados ? "current" : "pending",
      detail: playoffsTerminados ? null : "Por definir",
    },
  ];

  return { regularCompleta, playoffsExisten, playoffsEnCurso, playoffsTerminados, modoHome, stages };
}
