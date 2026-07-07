// Capa de dominio: proyecta el estado en vivo del partido a partir de sus
// MatchEvent. La Mesa (componentes/actions) nunca debe calcular reglas de
// partido directamente — todo pasa por acá.
//
// PR 3.1 resolvió cuartos. PR 3.2 sumó marcador y puntos por jugador. PR 3.3
// sumó faltas por jugador/equipo/cuarto. PR 3.5 sumó timeouts por equipo y
// por equipo/cuarto. PR 3.6 sumó la posesión actual. PR 3.7 expone el último
// evento vigente (para "Deshacer último" y su descripción en la consola) —
// los eventos anulados ya se excluyen acá, así que deshacer solo necesita
// marcar `anulado` en el evento (y sincronizar caches operativos si
// corresponde) para que este módulo recalcule todo automáticamente. Queda
// preparado para sumar en próximos PRs: timeline visible. La cancha/banca en
// vivo sigue viniendo de PartidoJugador.enCancha (PR 2.4/2.5), no de eventos.
import type { MatchEvent, PartidoJugador, TipoFalta } from "@/generated/prisma/client";

// Cuartos regulares fijos en 4 (reglamento estándar); overtime se numera
// correlativamente arriba de eso — OT1 = cuarto 5, OT2 = cuarto 6, etc. Sin
// límite de overtimes: se repiten tantos como haga falta hasta desempatar
// (ver calcularEstadoCuartos). Exportado porque actions.ts (reloj/timeouts) y
// la UI de Mesa/en-vivo necesitan el mismo corte para saber "tiempo regular
// vs overtime" sin duplicar el número mágico en cada archivo.
export const TOTAL_CUARTOS_REGULAR = 4;

// Duración de cada overtime — reglamento FIBA simplificado para esta PR (no
// se implementa la regla avanzada de "posesión de flecha" ni nada más).
const DURACION_OT_MINUTOS = 5;

// Label de un período: Q1-Q4 en tiempo regular, OT1/OT2/OT3... arriba de eso.
// Única fuente de verdad — la usan Mesa, /en-vivo, Play by Play y
// describir-evento.ts, así nunca queda un "Q5" hardcodeado en algún rincón
// de la UI cuando el partido entra en overtime.
export function labelPeriodo(cuarto: number): string {
  return cuarto <= TOTAL_CUARTOS_REGULAR ? `Q${cuarto}` : `OT${cuarto - TOTAL_CUARTOS_REGULAR}`;
}

// Duración de un período en segundos — tiempo regular usa la duración
// configurada del partido (duracionCuartoMinutos), overtime siempre son
// 5:00 fijos sin importar la duración configurada de los cuartos regulares.
export function duracionPeriodoSegundos(cuarto: number, duracionCuartoMinutos: number): number {
  return cuarto <= TOTAL_CUARTOS_REGULAR ? duracionCuartoMinutos * 60 : DURACION_OT_MINUTOS * 60;
}

// Reglamento: 5 timeouts por equipo en tiempo regular (acumulado Q1-Q4), 1
// timeout por equipo POR CADA overtime (se resetea en cada OT, no se
// acumula con tiempo regular ni entre overtimes distintos).
export function limiteTimeoutsParaPeriodo(cuarto: number): number {
  return cuarto <= TOTAL_CUARTOS_REGULAR ? 5 : 1;
}

// timeoutsLocalPorCuarto/timeoutsVisitantePorCuarto (calculados en
// calcularTimeouts) traen el desglose por cuarto — acá se decide cómo
// sumarlo según el período: en tiempo regular se acumula Q1-Q4 completo (el
// límite es sobre el total acumulado del partido), en overtime se cuenta
// solo ESE overtime puntual (el límite se resetea en cada uno).
export function timeoutsUsadosEnPeriodo(porCuarto: Map<number, number>, cuarto: number): number {
  if (cuarto > TOTAL_CUARTOS_REGULAR) return porCuarto.get(cuarto) ?? 0;
  let total = 0;
  for (const [c, n] of porCuarto) {
    if (c <= TOTAL_CUARTOS_REGULAR) total += n;
  }
  return total;
}

// "OFENSIVA" vive solo como string dentro de MatchEvent.detalle (Json) — no
// es parte del enum Postgres TipoFalta (que no está atado a ninguna columna
// real, ver PR Mesa 3.1). Se modela como unión de tipos en vez de tocar el
// enum de schema, así se evita una migración para agregar un valor que ya
// puede vivir tranquilo dentro del JSON.
export type TipoFaltaValor = TipoFalta | "OFENSIVA";

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
  // Empate al momento actual — determina si calcularEstadoCuartos ofrece
  // "finalizar" o el próximo overtime al terminar tiempo regular (o un OT).
  empatado: boolean;
  puntosPorJugador: Map<string, number>;
  faltasPorJugador: Map<string, number>;
  faltasEquipoLocal: number;
  faltasEquipoVisitante: number;
  faltasEquipoLocalCuartoActual: number;
  faltasEquipoVisitanteCuartoActual: number;
  tiposFaltaPorJugador: Map<string, TipoFaltaValor[]>;
  timeoutsLocal: number;
  timeoutsVisitante: number;
  timeoutsLocalPorCuarto: Map<number, number>;
  timeoutsVisitantePorCuarto: Map<number, number>;
  posesionClubId: string | null;
  posesionEquipo: PosesionEquipo;
  ultimoEventoVigente: MatchEventLite | null;
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
  empatado: boolean,
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
      mensajeCuartos: `${labelPeriodo(cuartoActivo)} en curso`,
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

  // Tiempo regular (o cualquier overtime previo) recién terminado: si el
  // marcador sigue empatado NO se ofrece "finalizar" — se ofrece iniciar el
  // siguiente overtime (OT1, OT2, OT3... tantos como hagan falta hasta
  // desempatar). Si no está empatado, el partido queda listo para finalizar.
  const regularOTerminado = ultimoCuartoFinalizado >= TOTAL_CUARTOS_REGULAR;
  if (regularOTerminado && !empatado) {
    return {
      estadoCuartos: "CUARTOS_COMPLETADOS",
      cuartoActivo: null,
      ultimoCuartoFinalizado,
      proximaAccionCuarto: null,
      mensajeCuartos: `${labelPeriodo(ultimoCuartoFinalizado)} finalizado`,
    };
  }

  const siguienteCuarto = ultimoCuartoFinalizado + 1;
  return {
    estadoCuartos: "ENTRE_CUARTOS",
    cuartoActivo: null,
    ultimoCuartoFinalizado,
    proximaAccionCuarto: { tipo: "iniciar", cuarto: siguienteCuarto },
    mensajeCuartos: regularOTerminado
      ? `Empate — ${labelPeriodo(siguienteCuarto)} disponible`
      : `Entre ${labelPeriodo(ultimoCuartoFinalizado)} y ${labelPeriodo(siguienteCuarto)}`,
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

function extraerTipoFalta(detalle: MatchEvent["detalle"]): TipoFaltaValor | null {
  if (
    detalle &&
    typeof detalle === "object" &&
    !Array.isArray(detalle) &&
    "tipoFalta" in detalle &&
    typeof (detalle as { tipoFalta: unknown }).tipoFalta === "string"
  ) {
    return (detalle as { tipoFalta: TipoFaltaValor }).tipoFalta;
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
  const tiposFaltaPorJugador = new Map<string, TipoFaltaValor[]>();
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
  // El marcador se calcula ANTES que el estado de cuartos porque
  // calcularEstadoCuartos necesita saber si está empatado para decidir si
  // ofrece "finalizar" o el próximo overtime.
  const marcador = calcularMarcadorYPuntos(vigentes, context);
  const empatado = marcador.marcadorLocal === marcador.marcadorVisitante;
  const estadoCuartos = calcularEstadoCuartos(vigentes, empatado);

  return {
    ...estadoCuartos,
    ...marcador,
    empatado,
    ...calcularFaltas(vigentes, context, estadoCuartos.cuartoActivo),
    ...calcularTimeouts(vigentes, context),
    ...calcularPosesion(vigentes, context),
    ultimoEventoVigente: vigentes.length > 0 ? vigentes[vigentes.length - 1] : null,
  };
}
