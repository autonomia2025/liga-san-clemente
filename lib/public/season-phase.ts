import { prisma } from "@/lib/db";
import { rondaDeJornada, type RondaPlayoff } from "@/lib/public/fase";

// Estado de la temporada: en qué momento del año está la liga. Es lo que le
// permite a la Home cambiar de "modo fase regular" a "modo playoffs" sola,
// sin ningún flag hardcodeado que haya que acordarse de apagar.
//
// A propósito NO importa playoffs-data.ts: ese módulo importa standings, que
// importa fase — meterlo acá crearía un ciclo. Lo único que necesita saber
// esta capa es si existe una fase de playoffs, en qué ronda va y si ya se
// jugó la final (detección de ronda compartida vía fase.ts); el detalle del
// bracket (y el campeón) lo aporta getPlayoffsData() por separado.

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
  const [regularTotal, regularPendientes, playoffsTotal, jornadasPlayoffs, jornadasRegularConPartidos] =
    await Promise.all([
      prisma.partido.count({ where: { jornada: { fase: "REGULAR" } } }),
      prisma.partido.count({ where: { jornada: { fase: "REGULAR" }, estado: { not: "FINALIZADO" } } }),
      prisma.partido.count({ where: { jornada: { fase: "PLAYOFFS" } } }),
      prisma.jornada.findMany({
        where: { fase: "PLAYOFFS" },
        select: { nombre: true, fase: true, partidos: { select: { estado: true } } },
      }),
      prisma.jornada.count({ where: { fase: "REGULAR", partidos: { some: {} } } }),
    ]);

  // Solo el cuadro por el título (rondaDeJornada excluye la Copa de Plata).
  const rondasTitulo = jornadasPlayoffs
    .map((j) => ({ ronda: rondaDeJornada(j.fase, j.nombre), estados: j.partidos.map((p) => p.estado) }))
    .filter((r): r is { ronda: RondaPlayoff; estados: typeof r.estados } => r.ronda !== null && r.estados.length > 0);
  const finales = rondasTitulo.filter((r) => r.ronda === "final");
  const rondaActual = (["final", "semis", "cuartos"] as const).find((ronda) =>
    rondasTitulo.some((r) => r.ronda === ronda),
  );
  const LABEL_RONDA: Record<"final" | "semis" | "cuartos", string> = {
    final: "La Final",
    semis: "Semifinales",
    cuartos: "Cuartos de Final",
  };

  const regularCompleta = regularTotal > 0 && regularPendientes === 0;
  const playoffsExisten = playoffsTotal > 0;
  // Terminan con la final por el título jugada — no cuando se acaban los
  // partidos cargados: después de las semis no queda ninguno pendiente hasta
  // que se crea la final, y eso no es "playoffs terminados".
  const playoffsTerminados =
    finales.length > 0 && finales.every((r) => r.estados.every((e) => e === "FINALIZADO"));
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
        ? playoffsTerminados
          ? "Terminados"
          : rondaActual
            ? LABEL_RONDA[rondaActual]
            : "En curso"
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
