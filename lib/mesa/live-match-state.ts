// Capa de dominio: proyecta el estado en vivo del partido a partir de sus
// MatchEvent. La Mesa (componentes/actions) nunca debe calcular reglas de
// partido directamente — todo pasa por acá.
//
// Este PR (3.1) solo resuelve el control de cuartos. La firma queda
// preparada para sumar en próximos PRs, a partir de los mismos eventos:
// marcador, puntos/faltas por jugador, faltas de equipo, posesión,
// timeline visible. La cancha/banca en vivo sigue viniendo de
// PartidoJugador.enCancha (PR 2.4/2.5), no de eventos.
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
};

type MatchEventLite = Pick<MatchEvent, "tipo" | "cuarto" | "anulado">;

export function buildLiveMatchState(
  events: MatchEventLite[],
  // Todavía no se usa en este PR — queda en la firma para cuando el
  // marcador/faltas necesiten cruzar eventos con el roster del partido.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _partidoJugadores: Pick<PartidoJugador, "id">[] = [],
): LiveMatchState {
  const vigentes = events.filter((e) => !e.anulado);

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
