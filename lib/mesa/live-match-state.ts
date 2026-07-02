// Capa de dominio: proyecta el estado en vivo del partido a partir de sus
// MatchEvent. La Mesa (componentes/actions) nunca debe calcular reglas de
// partido directamente — todo pasa por acá.
//
// PR 3.1 resolvió cuartos. PR 3.2 sumó marcador y puntos por jugador. PR 3.3
// sumó faltas por jugador/equipo/cuarto. PR 3.5 sumó timeouts por equipo y
// por equipo/cuarto. PR 3.6 suma la posesión actual, derivada del último
// evento POSESION vigente — nunca se guarda posesión en Partido. Queda
// preparado para sumar en próximos PRs: timeline visible. La cancha/banca en
// vivo sigue viniendo de PartidoJugador.enCancha (PR 2.4/2.5), no de eventos.
import type { MatchEvent, PartidoJugador, TipoFalta } from "@/generated/prisma/client";

const TOTAL_CUARTOS = 4;

export type EstadoCuartos =
  | "ESPERANDO_INICIO"
  | "CUARTO_ACTIVO"
  | "ENTRE_CUARTOS"
  | "CUARTOS_COMPLETADOS";

export type ProximaAccionCuarto = { tipo: "iniciar" | "finalizar"; cuarto: number } | null;

export type PosesionEquipo = "LOCAL" | "VISITANTE" | null;

export type LiveMatchState = {
  estadoCuartos: EstadoCuartos;
  cuartoActivo: number | null;
  ultimoCuartoFinalizado: number | null;
  proximaAccionCuarto: ProximaAccionCuarto;
  mensajeCuartos: string;
  marcadorLocal: number;
  marcadorVisitante: number;
  puntosPorJugador: Map<string, number>;
  faltasPorJugador: Map<string, number>;
  faltasEquipoLocal: number;
  faltasEquipoVisitante: number;
  faltasEquipoLocalCuartoActual: number;
  faltasEquipoVisitanteCuartoActual: number;
  tiposFaltaPorJugador: Map<string, TipoFalta[]>;
  timeoutsLocal: number;
  timeoutsVisitante: number;
  timeoutsLocalPorCuarto: Map<number, number>;
  timeoutsVisitantePorCuarto: Map<number, number>;
  posesionClubId: string | null;
  posesionEquipo: PosesionEquipo;
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

function extraerTipoFalta(detalle: MatchEvent["detalle"]): TipoFalta | null {
  if (
    detalle &&
    typeof detalle === "object" &&
    !Array.isArray(detalle) &&
    "tipoFalta" in detalle &&
    typeof (detalle as { tipoFalta: unknown }).tipoFalta === "string"
  ) {
    return (detalle as { tipoFalta: TipoFalta }).tipoFalta;
  }
  return null;
}

function calcularFaltas(
  vigentes: MatchEventLite[],
  context: LiveMatchContext,
  cuartoActivo: number | null,
): Pick<
  LiveMatchState,
  | "faltasPorJugador"
  | "faltasEquipoLocal"
  | "faltasEquipoVisitante"
  | "faltasEquipoLocalCuartoActual"
  | "faltasEquipoVisitanteCuartoActual"
  | "tiposFaltaPorJugador"
> {
  const faltasPorJugador = new Map<string, number>();
  const tiposFaltaPorJugador = new Map<string, TipoFalta[]>();
  let faltasEquipoLocal = 0;
  let faltasEquipoVisitante = 0;
  let faltasEquipoLocalCuartoActual = 0;
  let faltasEquipoVisitanteCuartoActual = 0;

  for (const e of vigentes) {
    if (e.tipo !== "FALTA" || !e.jugadorId || !e.clubId) continue;
    const tipoFalta = extraerTipoFalta(e.detalle);

    faltasPorJugador.set(e.jugadorId, (faltasPorJugador.get(e.jugadorId) ?? 0) + 1);
    if (tipoFalta) {
      const tipos = tiposFaltaPorJugador.get(e.jugadorId) ?? [];
      tipos.push(tipoFalta);
      tiposFaltaPorJugador.set(e.jugadorId, tipos);
    }

    const esCuartoActual = cuartoActivo !== null && e.cuarto === cuartoActivo;
    if (e.clubId === context.clubLocalId) {
      faltasEquipoLocal += 1;
      if (esCuartoActual) faltasEquipoLocalCuartoActual += 1;
    } else if (e.clubId === context.clubVisitanteId) {
      faltasEquipoVisitante += 1;
      if (esCuartoActual) faltasEquipoVisitanteCuartoActual += 1;
    }
  }

  return {
    faltasPorJugador,
    faltasEquipoLocal,
    faltasEquipoVisitante,
    faltasEquipoLocalCuartoActual,
    faltasEquipoVisitanteCuartoActual,
    tiposFaltaPorJugador,
  };
}

function calcularTimeouts(
  vigentes: MatchEventLite[],
  context: LiveMatchContext,
): Pick<
  LiveMatchState,
  "timeoutsLocal" | "timeoutsVisitante" | "timeoutsLocalPorCuarto" | "timeoutsVisitantePorCuarto"
> {
  const timeoutsLocalPorCuarto = new Map<number, number>();
  const timeoutsVisitantePorCuarto = new Map<number, number>();
  let timeoutsLocal = 0;
  let timeoutsVisitante = 0;

  for (const e of vigentes) {
    if (e.tipo !== "TIMEOUT" || !e.clubId) continue;

    if (e.clubId === context.clubLocalId) {
      timeoutsLocal += 1;
      timeoutsLocalPorCuarto.set(e.cuarto, (timeoutsLocalPorCuarto.get(e.cuarto) ?? 0) + 1);
    } else if (e.clubId === context.clubVisitanteId) {
      timeoutsVisitante += 1;
      timeoutsVisitantePorCuarto.set(e.cuarto, (timeoutsVisitantePorCuarto.get(e.cuarto) ?? 0) + 1);
    }
  }

  return { timeoutsLocal, timeoutsVisitante, timeoutsLocalPorCuarto, timeoutsVisitantePorCuarto };
}

function calcularPosesion(
  vigentes: MatchEventLite[],
  context: LiveMatchContext,
): Pick<LiveMatchState, "posesionClubId" | "posesionEquipo"> {
  let posesionClubId: string | null = null;

  for (const e of vigentes) {
    if (e.tipo !== "POSESION" || !e.clubId) continue;
    posesionClubId = e.clubId;
  }

  const posesionEquipo: PosesionEquipo =
    posesionClubId === context.clubLocalId
      ? "LOCAL"
      : posesionClubId === context.clubVisitanteId
        ? "VISITANTE"
        : null;

  return { posesionClubId, posesionEquipo };
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
  const estadoCuartos = calcularEstadoCuartos(vigentes);

  return {
    ...estadoCuartos,
    ...calcularMarcadorYPuntos(vigentes, context),
    ...calcularFaltas(vigentes, context, estadoCuartos.cuartoActivo),
    ...calcularTimeouts(vigentes, context),
    ...calcularPosesion(vigentes, context),
  };
}
