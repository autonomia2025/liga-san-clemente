// Minutos jugados por jugador — calculado 100% desde datos ya existentes, sin
// campo nuevo en el schema. Algoritmo:
//
// 1. Reconstruir el quinteto que arrancó el partido: se parte de quién está
//    EN CANCHA ahora mismo (PartidoJugador.enCancha) y se deshacen, en orden
//    cronológico inverso, todas las sustituciones registradas (evento
//    append-only, nunca se borra) — el resultado es exactamente el quinteto
//    real que puso Mesa en guardarTitulares, sin adivinar nada.
// 2. Reproducir hacia adelante, cuarto por cuarto: cada jugador en cancha
//    empieza su "turno" en duracionCuartoMinutos*60 al iniciar el cuarto:
//    (INICIO_CUARTO), y lo cierra en el clockLabel real de la sustitución que
//    lo saca (SUSTITUCION.detalle.clockLabel, dato real guardado por Mesa).
// 3. Si el cuarto ya terminó (hay FIN_CUARTO) y un jugador seguía en cancha
//    sin haber salido, se asume que el cuarto llegó a 00:00 — es la única
//    suposición real de este cálculo, porque FIN_CUARTO no guarda el reloj
//    exacto al que se cerró. Se documenta acá y en el reporte de la PR.
// 4. Si el cuarto todavía está activo, el turno de los que siguen en cancha
//    se cierra con el reloj EN VIVO (Partido.relojEstado/relojRestanteSegundos
//    vía lib/mesa/reloj.ts), no con un valor inventado.
//
// Si falta el clockLabel de alguna sustitución (dato de antes de esa PR),
// el cálculo completo se marca no confiable y se devuelve null — nunca se
// inventa un tiempo parcial.
import { extraerClock, extraerSustitucion } from "./describir-evento";

export type EventoMinutos = {
  tipo: string;
  cuarto: number;
  detalle: unknown;
};

export function calcularMinutosJugados(params: {
  enCanchaActualIds: Set<string>;
  eventos: EventoMinutos[];
  duracionCuartoMinutos: number;
  cuartoActivo: number | null;
  remainingSecondsActual: number | null;
}): Map<string, number> | null {
  const { eventos, duracionCuartoMinutos, cuartoActivo, remainingSecondsActual } = params;
  const duracionTotal = duracionCuartoMinutos * 60;

  const sustituciones = eventos.filter((e) => e.tipo === "SUSTITUCION");

  // 1. Reconstruir el quinteto inicial deshaciendo sustituciones en reversa.
  const enCanchaInicial = new Set(params.enCanchaActualIds);
  for (let i = sustituciones.length - 1; i >= 0; i--) {
    const sub = extraerSustitucion(sustituciones[i].detalle);
    if (!sub) return null; // dato viejo sin entra/sale — no se puede reconstruir con certeza
    enCanchaInicial.delete(sub.entraId);
    enCanchaInicial.add(sub.saleId);
  }

  // 2-4. Reproducir hacia adelante.
  const segundos = new Map<string, number>();
  const enCancha = new Set(enCanchaInicial);
  // Por jugador en cancha: segundos restantes del cuarto en el momento en que
  // empezó su turno actual (se fija en cada INICIO_CUARTO o al entrar por sustitución).
  const inicioTurno = new Map<string, number>();

  const acumular = (jugadorId: string, hasta: number) => {
    const desde = inicioTurno.get(jugadorId) ?? duracionTotal;
    segundos.set(jugadorId, (segundos.get(jugadorId) ?? 0) + Math.max(0, desde - hasta));
  };

  for (const e of eventos) {
    if (e.tipo === "INICIO_CUARTO") {
      for (const jugadorId of enCancha) inicioTurno.set(jugadorId, duracionTotal);
      continue;
    }

    if (e.tipo === "SUSTITUCION") {
      const sub = extraerSustitucion(e.detalle);
      const clock = extraerClock(e.detalle);
      if (!sub || !clock) return null;
      const remaining = clock.minuto * 60 + clock.segundo;
      if (enCancha.has(sub.saleId)) {
        acumular(sub.saleId, remaining);
        enCancha.delete(sub.saleId);
      }
      enCancha.add(sub.entraId);
      inicioTurno.set(sub.entraId, remaining);
      continue;
    }

    if (e.tipo === "FIN_CUARTO") {
      // Asunción documentada arriba: el cuarto llegó a 00:00.
      for (const jugadorId of enCancha) acumular(jugadorId, 0);
      continue;
    }
  }

  // Cuarto activo (sin FIN_CUARTO todavía): cerrar con el reloj en vivo.
  if (cuartoActivo !== null && remainingSecondsActual !== null) {
    for (const jugadorId of enCancha) acumular(jugadorId, remainingSecondsActual);
  }

  return segundos;
}

export function formatMinutosJugados(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
