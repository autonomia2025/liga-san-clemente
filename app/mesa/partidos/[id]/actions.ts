"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { TipoEvento, TipoFalta, OrigenStat } from "@/generated/prisma/client";
import {
  buildLiveMatchState,
  duracionPeriodoSegundos,
  limiteTimeoutsParaPeriodo,
  timeoutsUsadosEnPeriodo,
  TOTAL_CUARTOS_REGULAR,
} from "@/lib/mesa/live-match-state";
import { calcularRelojActual } from "@/lib/mesa/reloj";
import { leerReloj, escribirReloj } from "@/lib/mesa/reloj-db";
import { parseClockLabel } from "@/lib/mesa/describir-evento";

// El reloj persiste en DB (Partido.relojEstado/relojRestanteSegundos/
// relojUltimoInicio) — nunca se confía en lo que manda el cliente. Cada
// acción que registra un evento recalcula el tiempo actual server-side, en
// el momento exacto de guardar, leyendo el estado real del reloj desde la
// base. Esto es lo que sobrevive refresh/redirect/cambio de pestaña: no
// importa cuándo se registre la jugada, el tiempo que queda siempre se
// recalcula desde relojUltimoInicio (hora real del servidor).
async function clockDetalleServer(partidoId: string): Promise<{ minuto: number; segundo: number; clockLabel: string; remainingSeconds: number }> {
  const reloj = await leerReloj(partidoId);
  if (!reloj) return { minuto: 0, segundo: 0, clockLabel: "00:00", remainingSeconds: 0 };
  const r = calcularRelojActual(reloj, new Date());
  return {
    minuto: Math.floor(r.remainingSeconds / 60),
    segundo: r.remainingSeconds % 60,
    clockLabel: r.clockLabel,
    remainingSeconds: r.remainingSeconds,
  };
}

// Valida sesión Mesa + operador correcto + partido EN_CURSO — el chequeo que
// repite cada Server Action de esta consola antes de escribir nada. Devuelve
// un error listo para mostrar (nunca redirige acá adentro) para que cada
// action decida su propio mensaje y mantenga el control del flujo.
type OperadorCheck =
  | { error: string }
  | {
      usuario: NonNullable<Awaited<ReturnType<typeof getCurrentUsuario>>>;
      partido: NonNullable<Awaited<ReturnType<typeof prisma.partido.findUnique>>>;
    };

async function requireOperadorEnCurso(partidoId: string, mensajeError: string): Promise<OperadorCheck> {
  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.rol !== "MESA") {
    return { error: "Sesión inválida." };
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) {
    return { error: "Partido no encontrado." };
  }
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    return { error: mensajeError };
  }

  return { usuario, partido };
}

// Proyecta el estado vivo desde los eventos vigentes justo antes de escribir
// — nunca se confía en lo que mandó el form, así se evita duplicar cuartos,
// anotar sin cuarto activo, etc. si la pantalla quedó desactualizada.
async function getEstadoVigente(partidoId: string, clubLocalId: string, clubVisitanteId: string) {
  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  return buildLiveMatchState(eventos, { clubLocalId, clubVisitanteId });
}

const MAX_CONVOCADOS = 12;

// Límite de timeouts por período (5 en tiempo regular, 1 por overtime) — ver
// limiteTimeoutsParaPeriodo/timeoutsUsadosEnPeriodo en live-match-state.ts,
// que es la fuente de verdad real usada en registrarTimeout más abajo.

export async function guardarConvocados(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const localIds = formData.getAll("convocadosLocal").map(String);
  const visitanteIds = formData.getAll("convocadosVisitante").map(String);

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés editar los convocados de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (localIds.length > MAX_CONVOCADOS) {
    fail(`Máximo ${MAX_CONVOCADOS} convocados para el equipo local.`);
    return;
  }
  if (visitanteIds.length > MAX_CONVOCADOS) {
    fail(`Máximo ${MAX_CONVOCADOS} convocados para el equipo visitante.`);
    return;
  }

  const [localValidos, visitanteValidos] = await Promise.all([
    prisma.jugador.count({ where: { id: { in: localIds }, clubId: partido.clubLocalId } }),
    prisma.jugador.count({
      where: { id: { in: visitanteIds }, clubId: partido.clubVisitanteId },
    }),
  ]);
  if (localValidos !== localIds.length) {
    fail("Hay jugadores seleccionados que no pertenecen al club local.");
    return;
  }
  if (visitanteValidos !== visitanteIds.length) {
    fail("Hay jugadores seleccionados que no pertenecen al club visitante.");
    return;
  }

  const seleccionados = new Set([...localIds, ...visitanteIds]);
  const existentes = await prisma.partidoJugador.findMany({ where: { partidoId } });

  await prisma.$transaction([
    ...localIds.map((jugadorId) =>
      prisma.partidoJugador.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: { presente: true },
        create: { partidoId, jugadorId, clubId: partido.clubLocalId, presente: true },
      }),
    ),
    ...visitanteIds.map((jugadorId) =>
      prisma.partidoJugador.upsert({
        where: { partidoId_jugadorId: { partidoId, jugadorId } },
        update: { presente: true },
        create: { partidoId, jugadorId, clubId: partido.clubVisitanteId, presente: true },
      }),
    ),
    // Jugadores que estaban convocados y ya no: se desmarcan sin borrar la
    // fila (conserva historial de la jornada, "de forma controlada").
    ...existentes
      .filter((pj) => !seleccionados.has(pj.jugadorId))
      .map((pj) =>
        prisma.partidoJugador.update({
          where: { id: pj.id },
          data: { presente: false, titular: false, enCancha: false },
        }),
      ),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=convocados`);
}

const TITULARES_POR_EQUIPO = 5;

export async function guardarTitulares(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const titularesLocal = formData.getAll("titularesLocal").map(String);
  const titularesVisitante = formData.getAll("titularesVisitante").map(String);

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés editar los titulares de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (titularesLocal.length !== TITULARES_POR_EQUIPO) {
    fail(`El equipo local debe tener exactamente ${TITULARES_POR_EQUIPO} titulares.`);
    return;
  }
  if (titularesVisitante.length !== TITULARES_POR_EQUIPO) {
    fail(`El equipo visitante debe tener exactamente ${TITULARES_POR_EQUIPO} titulares.`);
    return;
  }

  const convocados = await prisma.partidoJugador.findMany({
    where: { partidoId, presente: true },
  });
  const convocadosLocalIds = new Set(
    convocados.filter((c) => c.clubId === partido.clubLocalId).map((c) => c.jugadorId),
  );
  const convocadosVisitanteIds = new Set(
    convocados.filter((c) => c.clubId === partido.clubVisitanteId).map((c) => c.jugadorId),
  );

  if (!titularesLocal.every((jugadorId) => convocadosLocalIds.has(jugadorId))) {
    fail("Hay titulares locales que no están entre los convocados.");
    return;
  }
  if (!titularesVisitante.every((jugadorId) => convocadosVisitanteIds.has(jugadorId))) {
    fail("Hay titulares visitantes que no están entre los convocados.");
    return;
  }

  // 4 updateMany en vez de un update por convocado: evita que la transacción
  // expire contra Supabase remoto cuando hay muchos convocados (timeout por
  // defecto de Prisma en $transaction es 5s, y N updates individuales por
  // round-trip lo superan fácil).
  await prisma.$transaction([
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubLocalId, presente: true },
      data: { titular: false, enCancha: false },
    }),
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubVisitanteId, presente: true },
      data: { titular: false, enCancha: false },
    }),
    prisma.partidoJugador.updateMany({
      where: { partidoId, clubId: partido.clubLocalId, jugadorId: { in: titularesLocal } },
      data: { titular: true, enCancha: true },
    }),
    prisma.partidoJugador.updateMany({
      where: {
        partidoId,
        clubId: partido.clubVisitanteId,
        jugadorId: { in: titularesVisitante },
      },
      data: { titular: true, enCancha: true },
    }),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=titulares`);
}

export async function controlarCuarto(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const accion = String(formData.get("accion") ?? "");
  const cuarto = Number(formData.get("cuarto") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés controlar los cuartos de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if ((accion !== "iniciar" && accion !== "finalizar") || !Number.isInteger(cuarto)) {
    fail("Acción de cuarto inválida.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  if (
    !estado.proximaAccionCuarto ||
    estado.proximaAccionCuarto.tipo !== accion ||
    estado.proximaAccionCuarto.cuarto !== cuarto
  ) {
    fail("Esa acción de cuarto ya no está disponible — la pantalla quedó desactualizada, recargá.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto,
      tipo: accion === "iniciar" ? TipoEvento.INICIO_CUARTO : TipoEvento.FIN_CUARTO,
    },
  });

  if (accion === "iniciar") {
    await prisma.partido.update({
      where: { id: partidoId },
      data: { cuartoActual: cuarto },
    });
  }

  // Tanto al iniciar un cuarto nuevo como al finalizar el actual, el reloj
  // vuelve a la duración completa del PRÓXIMO período (Q1-Q4 usan
  // duracionCuartoMinutos, overtime siempre 5:00) y pausado — ninguno de los
  // dos casos debe heredar el tiempo que quedó corriendo del cuarto anterior.
  // Al iniciar, "cuarto" ya es el nuevo período; al finalizar, el próximo
  // período todavía no se decidió (puede ser el siguiente cuarto/OT o el fin
  // del partido), así que se resetea a la duración del cuarto que se acaba
  // de cerrar — de todos modos se vuelve a resetear al iniciar el siguiente.
  await escribirReloj(partidoId, {
    relojEstado: "PAUSADO",
    relojRestanteSegundos: duracionPeriodoSegundos(cuarto, partido.duracionCuartoMinutos),
    relojUltimoInicio: null,
  });

  redirect(`/mesa/partidos/${partidoId}?ok=cuarto`);
}

// --- Reloj del partido -----------------------------------------------------
// La DB es la fuente de verdad (ver lib/mesa/reloj.ts). Estas 4 acciones son
// las únicas que escriben Partido.relojEstado/relojRestanteSegundos/
// relojUltimoInicio — todo lo demás solo LEE el reloj (clockDetalleServer)
// para saber qué hora mostrar en un evento nuevo.

export async function iniciarOReanudarReloj(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés controlar el reloj de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }

  const reloj = await leerReloj(partidoId);
  if (!reloj) {
    fail("No se pudo leer el reloj de este partido.");
    return;
  }

  // Sirve tanto para "Iniciar" (relojRestanteSegundos todavía en la duración
  // completa, sin tocar desde que empezó el cuarto) como para "Reanudar"
  // (relojRestanteSegundos quedó en lo que faltaba al pausar) — misma
  // operación en ambos casos: fijar el instante de arranque en el servidor.
  const actual = calcularRelojActual(reloj, new Date());
  if (actual.remainingSeconds === 0) {
    fail("El cuarto ya llegó a 00:00 — terminá el cuarto en vez de reanudar.");
    return;
  }

  await escribirReloj(partidoId, {
    relojEstado: "CORRIENDO",
    relojRestanteSegundos: actual.remainingSeconds,
    relojUltimoInicio: new Date(),
  });

  redirect(`/mesa/partidos/${partidoId}?ok=reloj`);
}

export async function pausarReloj(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés controlar el reloj de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }

  const reloj = await leerReloj(partidoId);
  if (!reloj) {
    fail("No se pudo leer el reloj de este partido.");
    return;
  }

  const actual = calcularRelojActual(reloj, new Date());
  await escribirReloj(partidoId, {
    relojEstado: "PAUSADO",
    relojRestanteSegundos: actual.remainingSeconds,
    relojUltimoInicio: null,
  });

  redirect(`/mesa/partidos/${partidoId}?ok=reloj`);
}

export async function resetearReloj(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés controlar el reloj de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  // Reset debe volver a la duración del período ACTUAL (Q1-Q4 vs overtime),
  // no siempre a duracionCuartoMinutos — si no, resetear el reloj durante un
  // overtime lo mandaría de vuelta a 10:00 en vez de 05:00.
  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);
  const cuartoParaReset = estado.cuartoActivo ?? partido.cuartoActual;

  await escribirReloj(partidoId, {
    relojEstado: "PAUSADO",
    relojRestanteSegundos: duracionPeriodoSegundos(cuartoParaReset, partido.duracionCuartoMinutos),
    relojUltimoInicio: null,
  });

  redirect(`/mesa/partidos/${partidoId}?ok=reloj`);
}

// Ajuste manual (ej. desincronizado con el reloj oficial de cancha). Siempre
// pausa al ajustar — evita el caso raro de "arrancar corriendo" con un valor
// recién tipeado por el operador.
export async function ajustarReloj(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const valor = String(formData.get("valor") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés controlar el reloj de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }

  const clock = parseClockLabel(valor);
  if (!clock) {
    fail("Formato de reloj inválido — usá MM:SS.");
    return;
  }

  await escribirReloj(partidoId, {
    relojEstado: "PAUSADO",
    relojRestanteSegundos: clock.minuto * 60 + clock.segundo,
    relojUltimoInicio: null,
  });

  redirect(`/mesa/partidos/${partidoId}?ok=reloj`);
}

const VALORES_PUNTO_VALIDOS = [1, 2, 3];

export async function registrarPunto(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const valor = Number(formData.get("valor") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés registrar puntos en este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (!VALORES_PUNTO_VALIDOS.includes(valor)) {
    fail("Valor de punto inválido.");
    return;
  }

  // Solo un jugador enCancha=true (convocado y en cancha) puede anotar —
  // cubre banca y no-convocados con la misma verificación.
  const partidoJugador = await prisma.partidoJugador.findUnique({
    where: { partidoId_jugadorId: { partidoId, jugadorId } },
  });
  if (!partidoJugador || !partidoJugador.enCancha) {
    fail("Solo se pueden registrar puntos a jugadores en cancha.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  if (estado.cuartoActivo === null) {
    fail("No hay un cuarto activo — iniciá el cuarto antes de registrar puntos.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: estado.cuartoActivo,
      tipo: TipoEvento.PUNTO,
      jugadorId,
      clubId: partidoJugador.clubId,
      detalle: { valor, ...(await clockDetalleServer(partidoId)) },
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=punto`);
}

// "OFENSIVA" no es parte del enum Postgres TipoFalta (no está atado a
// ninguna columna real, MatchEvent.detalle es Json) — se agrega acá como
// string suelto en vez de tocar el enum de schema/migrar. Ver PR Mesa 3.1.
const TIPOS_FALTA_VALIDOS: readonly string[] = [...Object.values(TipoFalta), "OFENSIVA"];

export async function registrarFalta(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const tipoFalta = String(formData.get("tipoFalta") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés registrar faltas en este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (!TIPOS_FALTA_VALIDOS.includes(tipoFalta)) {
    fail("Tipo de falta inválido.");
    return;
  }

  // Solo un jugador enCancha=true (convocado y en cancha) puede recibir falta
  // desde la consola principal — cubre banca y no-convocados con la misma
  // verificación.
  const partidoJugador = await prisma.partidoJugador.findUnique({
    where: { partidoId_jugadorId: { partidoId, jugadorId } },
  });
  if (!partidoJugador || !partidoJugador.enCancha) {
    fail("Solo se pueden registrar faltas a jugadores en cancha.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  if (estado.cuartoActivo === null) {
    fail("No hay un cuarto activo — iniciá el cuarto antes de registrar faltas.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: estado.cuartoActivo,
      tipo: TipoEvento.FALTA,
      jugadorId,
      clubId: partidoJugador.clubId,
      detalle: { tipoFalta, ...(await clockDetalleServer(partidoId)) },
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=falta`);
}

export async function registrarSustitucion(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const jugadorSaleId = String(formData.get("jugadorSaleId") ?? "");
  const jugadorEntraId = String(formData.get("jugadorEntraId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés registrar sustituciones en este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (!jugadorSaleId || !jugadorEntraId || jugadorSaleId === jugadorEntraId) {
    fail("Sustitución inválida.");
    return;
  }

  const [partidoJugadorSale, partidoJugadorEntra] = await Promise.all([
    prisma.partidoJugador.findUnique({
      where: { partidoId_jugadorId: { partidoId, jugadorId: jugadorSaleId } },
    }),
    prisma.partidoJugador.findUnique({
      where: { partidoId_jugadorId: { partidoId, jugadorId: jugadorEntraId } },
    }),
  ]);

  if (!partidoJugadorSale || !partidoJugadorSale.presente || !partidoJugadorSale.enCancha) {
    fail("El jugador que sale debe estar convocado y en cancha.");
    return;
  }
  if (!partidoJugadorEntra || !partidoJugadorEntra.presente || partidoJugadorEntra.enCancha) {
    fail("El jugador que entra debe estar convocado y en banca.");
    return;
  }
  if (partidoJugadorSale.clubId !== partidoJugadorEntra.clubId) {
    fail("La sustitución debe ser entre jugadores del mismo equipo.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  // Las sustituciones se permiten aunque no haya cuarto activo (entre
  // cuartos, con el reloj pausado) — solo se bloquea registrar puntos/faltas
  // sin cuarto corriendo, no cambios de lineup. Si no hay cuarto activo se
  // usa cuartoActual (el último cuarto tocado) para no dejar el evento sin
  // cuarto asignado.
  const cuartoParaEvento = estado.cuartoActivo ?? partido.cuartoActual;

  await prisma.$transaction([
    prisma.partidoJugador.update({
      where: { id: partidoJugadorSale.id },
      data: { enCancha: false },
    }),
    prisma.partidoJugador.update({
      where: { id: partidoJugadorEntra.id },
      data: { enCancha: true },
    }),
    prisma.matchEvent.create({
      data: {
        partidoId,
        cuarto: cuartoParaEvento,
        tipo: TipoEvento.SUSTITUCION,
        jugadorId: jugadorEntraId,
        clubId: partidoJugadorSale.clubId,
        detalle: { jugadorEntraId, jugadorSaleId, ...(await clockDetalleServer(partidoId)) },
      },
    }),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=sustitucion`);
}

export async function registrarTimeout(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const clubId = String(formData.get("clubId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés registrar timeouts en este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (clubId !== partido.clubLocalId && clubId !== partido.clubVisitanteId) {
    fail("Ese club no pertenece a este partido.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  // Se permite pedir timeout aunque no haya cuarto activo (entre cuartos, con
  // el reloj pausado) — solo se limita por el reglamento, no por el estado
  // del cuarto/reloj. El límite depende del período: 5 acumulados en tiempo
  // regular (Q1-Q4), 1 por cada overtime (se resetea en cada uno).
  const cuartoParaEvento = estado.cuartoActivo ?? partido.cuartoActual;
  const porCuartoDelClub =
    clubId === partido.clubLocalId ? estado.timeoutsLocalPorCuarto : estado.timeoutsVisitantePorCuarto;
  const usados = timeoutsUsadosEnPeriodo(porCuartoDelClub, cuartoParaEvento);
  const limite = limiteTimeoutsParaPeriodo(cuartoParaEvento);
  if (usados >= limite) {
    fail(
      cuartoParaEvento > TOTAL_CUARTOS_REGULAR
        ? "Ese equipo ya usó su timeout de este overtime."
        : `Ese equipo ya usó sus ${limite} timeouts del tiempo regular.`,
    );
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: cuartoParaEvento,
      tipo: TipoEvento.TIMEOUT,
      clubId,
      detalle: await clockDetalleServer(partidoId),
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=timeout`);
}

export async function registrarPosesion(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const clubId = String(formData.get("clubId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés cambiar la posesión de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  if (clubId !== partido.clubLocalId && clubId !== partido.clubVisitanteId) {
    fail("Ese club no pertenece a este partido.");
    return;
  }

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  // Se permite marcar posesión entre cuartos también (ej. definir quién
  // saca a jugar el próximo cuarto antes de que arranque el reloj).
  const cuartoParaEvento = estado.cuartoActivo ?? partido.cuartoActual;

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: cuartoParaEvento,
      tipo: TipoEvento.POSESION,
      clubId,
      detalle: await clockDetalleServer(partidoId),
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=posesion`);
}

export async function deshacerUltimoEvento(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés deshacer eventos de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { usuario } = check;

  // Se busca directo en la base (no vía buildLiveMatchState) porque acá se
  // necesita el id de la fila para anularla, no solo la proyección de estado.
  const ultimoEvento = await prisma.matchEvent.findFirst({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "desc" },
  });
  if (!ultimoEvento) {
    fail("No hay eventos para deshacer.");
    return;
  }

  if (ultimoEvento.tipo === TipoEvento.SUSTITUCION) {
    const detalle = ultimoEvento.detalle as { jugadorEntraId?: string; jugadorSaleId?: string } | null;
    const jugadorEntraId = detalle?.jugadorEntraId;
    const jugadorSaleId = detalle?.jugadorSaleId;
    if (!jugadorEntraId || !jugadorSaleId) {
      fail("No se puede deshacer esta sustitución: faltan datos del evento.");
      return;
    }

    const [partidoJugadorEntra, partidoJugadorSale] = await Promise.all([
      prisma.partidoJugador.findUnique({
        where: { partidoId_jugadorId: { partidoId, jugadorId: jugadorEntraId } },
      }),
      prisma.partidoJugador.findUnique({
        where: { partidoId_jugadorId: { partidoId, jugadorId: jugadorSaleId } },
      }),
    ]);
    if (!partidoJugadorEntra || !partidoJugadorSale) {
      fail("No se puede deshacer esta sustitución: jugadores no encontrados en el partido.");
      return;
    }

    await prisma.$transaction([
      prisma.partidoJugador.update({
        where: { id: partidoJugadorEntra.id },
        data: { enCancha: false },
      }),
      prisma.partidoJugador.update({
        where: { id: partidoJugadorSale.id },
        data: { enCancha: true },
      }),
      prisma.matchEvent.update({
        where: { id: ultimoEvento.id },
        data: { anulado: true, anuladoPorId: usuario.id, anuladoAt: new Date() },
      }),
    ]);

    redirect(`/mesa/partidos/${partidoId}?ok=deshacer`);
  }

  if (ultimoEvento.tipo === TipoEvento.INICIO_CUARTO) {
    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.update({
        where: { id: ultimoEvento.id },
        data: { anulado: true, anuladoPorId: usuario.id, anuladoAt: new Date() },
      });
      const iniciosVigentes = await tx.matchEvent.findMany({
        where: { partidoId, anulado: false, tipo: TipoEvento.INICIO_CUARTO },
        select: { cuarto: true },
      });
      const nuevoCuartoActual =
        iniciosVigentes.length > 0 ? Math.max(...iniciosVigentes.map((e) => e.cuarto)) : 0;
      await tx.partido.update({
        where: { id: partidoId },
        data: { cuartoActual: nuevoCuartoActual },
      });
    });

    redirect(`/mesa/partidos/${partidoId}?ok=deshacer`);
  }

  // FIN_CUARTO, PUNTO, FALTA, TIMEOUT, POSESION: alcanza con anular el
  // evento — buildLiveMatchState recalcula todo lo demás desde eventos
  // vigentes (cuartoActual no se toca al finalizar, así que no hace falta
  // sincronizarlo acá).
  await prisma.matchEvent.update({
    where: { id: ultimoEvento.id },
    data: { anulado: true, anuladoPorId: usuario.id, anuladoAt: new Date() },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=deshacer`);
}

// --- Corrección de jugadas recientes (Mesa 3.2) -----------------------------
// Complementa a "Deshacer último evento" (arriba): ese solo puede revertir el
// evento más reciente porque SUSTITUCION/INICIO_CUARTO tienen estado derivado
// (PartidoJugador.enCancha / Partido.cuartoActual) que solo es seguro revertir
// si es lo último que pasó — anular uno de esos en cualquier otra posición
// podría desincronizar ese cache. PUNTO/FALTA/TIMEOUT/POSESION no tienen ese
// problema: marcador, faltas, bonus y timeouts siempre se recalculan desde
// cero sumando los eventos vigentes (ver buildLiveMatchState), así que
// anular o editar uno de ellos en cualquier posición reciente es siempre
// seguro. Por eso el editor de "jugadas recientes" solo ofrece estos 4 tipos;
// SUSTITUCION/INICIO_CUARTO/FIN_CUARTO se quedan exclusivamente en el flujo
// de "Deshacer último evento" ya existente.
const TIPOS_ANULABLES_DESDE_LISTA: TipoEvento[] = [
  TipoEvento.PUNTO,
  TipoEvento.FALTA,
  TipoEvento.TIMEOUT,
  TipoEvento.POSESION,
];

async function buscarEventoDelPartido(partidoId: string, eventoId: string) {
  const evento = await prisma.matchEvent.findUnique({ where: { id: eventoId } });
  if (!evento || evento.partidoId !== partidoId) return null;
  return evento;
}

// Editar punto/falta preserva cuarto, clockLabel y createdAt del evento
// original (no se tocan) — solo cambia jugadorId/clubId/el valor corregido
// dentro de detalle. El club se deriva del club real del jugador elegido
// (PartidoJugador.clubId) en vez de aceptarlo como campo independiente del
// formulario, así nunca queda un evento con jugador de un equipo y clubId de
// otro por un desajuste en la UI.
export async function editarPunto(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const eventoId = String(formData.get("eventoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const valor = Number(formData.get("valor") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés corregir jugadas de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }

  if (!VALORES_PUNTO_VALIDOS.includes(valor)) {
    fail("Valor de punto inválido.");
    return;
  }

  const evento = await buscarEventoDelPartido(partidoId, eventoId);
  if (!evento) {
    fail("Evento no encontrado.");
    return;
  }
  if (evento.tipo !== TipoEvento.PUNTO) {
    fail("Este evento no es un punto.");
    return;
  }
  if (evento.anulado) {
    fail("Este evento ya está anulado — no se puede editar.");
    return;
  }

  const partidoJugador = await prisma.partidoJugador.findUnique({
    where: { partidoId_jugadorId: { partidoId, jugadorId } },
  });
  if (!partidoJugador || !partidoJugador.presente) {
    fail("El jugador debe estar convocado a este partido.");
    return;
  }

  const detalleActual =
    evento.detalle && typeof evento.detalle === "object" && !Array.isArray(evento.detalle)
      ? (evento.detalle as Record<string, number | string>)
      : {};
  await prisma.matchEvent.update({
    where: { id: eventoId },
    data: {
      jugadorId,
      clubId: partidoJugador.clubId,
      detalle: { ...detalleActual, valor },
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=punto_editado`);
}

export async function editarFalta(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const eventoId = String(formData.get("eventoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const tipoFalta = String(formData.get("tipoFalta") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés corregir jugadas de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }

  if (!TIPOS_FALTA_VALIDOS.includes(tipoFalta)) {
    fail("Tipo de falta inválido.");
    return;
  }

  const evento = await buscarEventoDelPartido(partidoId, eventoId);
  if (!evento) {
    fail("Evento no encontrado.");
    return;
  }
  if (evento.tipo !== TipoEvento.FALTA) {
    fail("Este evento no es una falta.");
    return;
  }
  if (evento.anulado) {
    fail("Este evento ya está anulado — no se puede editar.");
    return;
  }

  const partidoJugador = await prisma.partidoJugador.findUnique({
    where: { partidoId_jugadorId: { partidoId, jugadorId } },
  });
  if (!partidoJugador || !partidoJugador.presente) {
    fail("El jugador debe estar convocado a este partido.");
    return;
  }

  const detalleActual =
    evento.detalle && typeof evento.detalle === "object" && !Array.isArray(evento.detalle)
      ? (evento.detalle as Record<string, number | string>)
      : {};
  await prisma.matchEvent.update({
    where: { id: eventoId },
    data: {
      jugadorId,
      clubId: partidoJugador.clubId,
      detalle: { ...detalleActual, tipoFalta },
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=falta_editada`);
}

// Anulación lógica — reutiliza exactamente el mismo patrón que ya usa
// deshacerUltimoEvento (columnas reales anulado/anuladoPorId/anuladoAt, no se
// borra nada). motivoAnulacion es opcional y se guarda dentro de detalle
// porque no existe una columna dedicada para eso — no rompe ningún cálculo
// existente, ni extraerValorPunto ni extraerTipoFalta leen esa clave.
export async function anularEvento(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const eventoId = String(formData.get("eventoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés anular jugadas de este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { usuario } = check;

  const evento = await buscarEventoDelPartido(partidoId, eventoId);
  if (!evento) {
    fail("Evento no encontrado.");
    return;
  }
  if (evento.anulado) {
    fail("Este evento ya está anulado.");
    return;
  }
  if (!TIPOS_ANULABLES_DESDE_LISTA.includes(evento.tipo)) {
    fail("Este tipo de evento solo se puede deshacer si es la última jugada — usá 'Deshacer último evento'.");
    return;
  }

  const detalleActual =
    evento.detalle && typeof evento.detalle === "object" && !Array.isArray(evento.detalle)
      ? (evento.detalle as Record<string, number | string>)
      : {};
  await prisma.matchEvent.update({
    where: { id: eventoId },
    data: {
      anulado: true,
      anuladoPorId: usuario.id,
      anuladoAt: new Date(),
      detalle: motivo ? { ...detalleActual, motivoAnulacion: motivo } : detalleActual,
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=anulado`);
}

export async function finalizarPartido(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const check = await requireOperadorEnCurso(partidoId, "No podés finalizar este partido.");
  if ("error" in check) {
    fail(check.error);
    return;
  }
  const { partido } = check;

  const estado = await getEstadoVigente(partidoId, partido.clubLocalId, partido.clubVisitanteId);

  // estadoCuartos solo es CUARTOS_COMPLETADOS cuando terminó tiempo regular
  // (o un overtime) Y el marcador no está empatado — ver calcularEstadoCuartos.
  // Este chequeo ya alcanza para bloquear el empate, pero se agrega un
  // mensaje específico para no confundir a la Mesa con "debe terminar Q4"
  // cuando en realidad lo que falta es desempatar en overtime.
  if (estado.estadoCuartos !== "CUARTOS_COMPLETADOS") {
    if (estado.empatado && estado.ultimoCuartoFinalizado !== null && estado.ultimoCuartoFinalizado >= TOTAL_CUARTOS_REGULAR) {
      fail("El partido está empatado — hay que iniciar un overtime antes de finalizar.");
      return;
    }
    fail("Para finalizar el partido, primero debe terminar el período actual.");
    return;
  }

  // Atómico con guardia de estado: si otro request ya finalizó este partido
  // entre el findUnique de arriba y este update, count será 0 y se rechaza
  // en vez de duplicar el cierre.
  const { count } = await prisma.partido.updateMany({
    where: { id: partidoId, estado: "EN_CURSO" },
    data: { estado: "FINALIZADO" },
  });
  if (count === 0) {
    fail("Este partido ya fue finalizado.");
    return;
  }

  redirect(`/mesa/partidos/${partidoId}?ok=finalizado`);
}

export async function generarActa(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/mesa/partidos/${partidoId}?error=${encodeURIComponent(mensaje)}`);

  const usuario = await getCurrentUsuario();
  if (!usuario || usuario.rol !== "MESA") {
    fail("Sesión inválida.");
    return;
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) {
    fail("Partido no encontrado.");
    return;
  }
  if (partido.estado !== "FINALIZADO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés generar el Acta de este partido.");
    return;
  }

  const [eventos, convocados] = await Promise.all([
    prisma.matchEvent.findMany({
      where: { partidoId, anulado: false },
      orderBy: { createdAt: "asc" },
      select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
    }),
    prisma.partidoJugador.findMany({ where: { partidoId, presente: true } }),
  ]);

  if (convocados.length === 0) {
    fail("No hay jugadores convocados para generar estadísticas.");
    return;
  }

  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  // Idempotente: reemplaza Acta (upsert por partidoId único) y las stats
  // EVENTOS de este partido en la misma transacción — regenerar el Acta
  // nunca duplica filas, solo recalcula desde los eventos vigentes actuales.
  await prisma.$transaction([
    prisma.acta.upsert({
      where: { partidoId },
      create: {
        partidoId,
        resultadoLocal: estado.marcadorLocal,
        resultadoVisitante: estado.marcadorVisitante,
      },
      update: {
        resultadoLocal: estado.marcadorLocal,
        resultadoVisitante: estado.marcadorVisitante,
      },
    }),
    prisma.jugadorPartidoStat.deleteMany({ where: { partidoId, origen: OrigenStat.EVENTOS } }),
    prisma.jugadorPartidoStat.createMany({
      data: convocados.map((c) => ({
        partidoId,
        jugadorId: c.jugadorId,
        clubId: c.clubId,
        puntos: estado.puntosPorJugador.get(c.jugadorId) ?? 0,
        faltas: estado.faltasPorJugador.get(c.jugadorId) ?? 0,
        origen: OrigenStat.EVENTOS,
      })),
    }),
  ]);

  redirect(`/mesa/partidos/${partidoId}?ok=acta`);
}
