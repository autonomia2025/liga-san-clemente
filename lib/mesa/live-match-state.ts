// Capa de dominio: proyecta el estado en vivo del partido a partir de sus
// MatchEvent. La Mesa (componentes/actions) nunca debe calcular reglas de
// partido directamente — todo pasa por acá.
//
// PR 3.1 resolvió cuartos. PR 3.2 suma marcador y puntos por jugador, ambos
// derivados de eventos PUNTO — nunca se guarda un "marcador actual" en
// Partido. Queda preparado para sumar en próximos PRs: faltas por jugador/
// equipo, posesión, timeline visible. La cancha/banca en vivo sigue
// viniendo de PartidoJugador.enCancha (PR 2.4/2.5), no de eventos.
import type { MatchEvent, PartidoJugador } from "@/generated/prisma/client";

const TOTAL_CUARTOS = 4;

export type EstadoCuartos =
  | "ESPERANDO_INICIO"
  | "CUARTO_ACTIVO"
  | "ENTRE_CUARTOS"
  | "CUARTOS_COMPLETADOS";

export type ProximaAccionCuarto = { tipo: "iniciar" | "finalizar"; cuarto: number } | null;

export type LiveMatchState = {
  estadoCuartos: EstadoCuartos;
  cuartoActivo: number | null;
  ultimoCuartoFinalizado: number | null;
  proximaAccionCuarto: ProximaAccionCuarto;
  mensajeCuartos: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  puntosPorJugador: Map<string, number>;
};

type MatchEventLite = Pick<
  MatchEvent,
  "tipo" | "cuarto" | "anulado" | "jugadorId" | "clubId" | "detalle"
>;

export type LiveMatchContext = {
  clubLocalId: string;
  clubVisitanteId: string;
};

function calcularEstadoCuartos(
  vigentes: MatchEventLite[],
): Pick<
  LiveMatchState,
  "estadoCuartos" | "cuartoActivo" | "ultimoCuartoFinalizado" | "proximaAccionCuarto" | "mensajeCuartos"
> {
  const iniciados = new Set(
    vigentes.filter((e) => e.tipo === "INICIO_CUARTO").map((e) => e.cuarto),
  );
  const finalizados = new Set(
    vigentes.filter((e) => e.tipo === "FIN_CUARTO").map((e) => e.cuarto),
  );

  const cuartoActivo = [...iniciados].find((c) => !finalizados.has(c)) ?? null;
  const ultimoCuartoFinalizado = finalizados.size > 0 ? Math.max(...finalizados) : null;

  if (cuartoActivo !== null) {
    return {
      estadoCuartos: "CUARTO_ACTIVO",
      cuartoActivo,
      ultimoCuartoFinalizado,
      proximaAccionCuarto: { tipo: "finalizar", cuarto: cuartoActivo },
      mensajeCuartos: `Q${cuartoActivo} en curso`,
    };
  }

  if (ultimoCuartoFinalizado === null) {
    return {
      estadoCuartos: "ESPERANDO_INICIO",
      cuartoActivo: null,
      ultimoCuartoFinalizado: null,
      proximaAccionCuarto: { tipo: "iniciar", cuarto: 1 },
      mensajeCuartos: "Esperando inicio de Q1",
    };
  }

  if (ultimoCuartoFinalizado >= TOTAL_CUARTOS) {
    return {
      estadoCuartos: "CUARTOS_COMPLETADOS",
      cuartoActivo: null,
      ultimoCuartoFinalizado,
      proximaAccionCuarto: null,
      mensajeCuartos: `Q${TOTAL_CUARTOS} finalizado`,
    };
  }

  const siguienteCuarto = ultimoCuartoFinalizado + 1;
  return {
    estadoCuartos: "ENTRE_CUARTOS",
    cuartoActivo: null,
    ultimoCuartoFinalizado,
    proximaAccionCuarto: { tipo: "iniciar", cuarto: siguienteCuarto },
    mensajeCuartos: `Entre Q${ultimoCuartoFinalizado} y Q${siguienteCuarto}`,
  };
}

function extraerValorPunto(detalle: MatchEvent["detalle"]): number {
  if (
    detalle &&
    typeof detalle === "object" &&
    !Array.isArray(detalle) &&
    "valor" in detalle &&
    typeof (detalle as { valor: unknown }).valor === "number"
  ) {
    return (detalle as { valor: number }).valor;
  }
  return 0;
}

function calcularMarcadorYPuntos(
  vigentes: MatchEventLite[],
  context: LiveMatchContext,
): Pick<LiveMatchState, "marcadorLocal" | "marcadorVisitante" | "puntosPorJugador"> {
  const puntosPorJugador = new Map<string, number>();
  let marcadorLocal = 0;
  let marcadorVisitante = 0;

  for (const e of vigentes) {
    if (e.tipo !== "PUNTO" || !e.jugadorId || !e.clubId) continue;
    const valor = extraerValorPunto(e.detalle);

    puntosPorJugador.set(e.jugadorId, (puntosPorJugador.get(e.jugadorId) ?? 0) + valor);

    if (e.clubId === context.clubLocalId) marcadorLocal += valor;
    else if (e.clubId === context.clubVisitanteId) marcadorVisitante += valor;
  }

  return { marcadorLocal, marcadorVisitante, puntosPorJugador };
}

export function buildLiveMatchState(
  events: MatchEventLite[],
  context: LiveMatchContext,
  // Todavía no se usa — queda en la firma para cuando faltas/posesión
  // necesiten cruzar eventos con el roster del partido.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _partidoJugadores: Pick<PartidoJugador, "id">[] = [],
): LiveMatchState {
  const vigentes = events.filter((e) => !e.anulado);

  return {
    ...calcularEstadoCuartos(vigentes),
    ...calcularMarcadorYPuntos(vigentes, context),
  };
}
