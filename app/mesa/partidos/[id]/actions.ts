"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { TipoEvento, TipoFalta } from "@/generated/prisma/client";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";

const MAX_CONVOCADOS = 12;

export async function guardarConvocados(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const localIds = formData.getAll("convocadosLocal").map(String);
  const visitanteIds = formData.getAll("convocadosVisitante").map(String);

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés editar los convocados de este partido.");
    return;
  }

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés editar los titulares de este partido.");
    return;
  }

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés controlar los cuartos de este partido.");
    return;
  }

  if ((accion !== "iniciar" && accion !== "finalizar") || !Number.isInteger(cuarto)) {
    fail("Acción de cuarto inválida.");
    return;
  }

  // Se recalcula el estado desde los eventos justo antes de escribir (no se
  // confía en lo que mandó el form) — evita iniciar/finalizar dos veces o
  // saltear cuartos si la pantalla quedó desactualizada.
  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

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

  redirect(`/mesa/partidos/${partidoId}?ok=cuarto`);
}

const VALORES_PUNTO_VALIDOS = [1, 2, 3];

export async function registrarPunto(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const valor = Number(formData.get("valor") ?? "");

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés registrar puntos en este partido.");
    return;
  }

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

  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

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
      detalle: { valor },
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=punto`);
}

const TIPOS_FALTA_VALIDOS = Object.values(TipoFalta);

export async function registrarFalta(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const jugadorId = String(formData.get("jugadorId") ?? "");
  const tipoFalta = String(formData.get("tipoFalta") ?? "");

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés registrar faltas en este partido.");
    return;
  }

  if (!TIPOS_FALTA_VALIDOS.includes(tipoFalta as TipoFalta)) {
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

  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

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
      detalle: { tipoFalta },
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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés registrar sustituciones en este partido.");
    return;
  }

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

  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  if (estado.cuartoActivo === null) {
    fail("No hay un cuarto activo — iniciá el cuarto antes de registrar sustituciones.");
    return;
  }

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
        cuarto: estado.cuartoActivo,
        tipo: TipoEvento.SUSTITUCION,
        jugadorId: jugadorEntraId,
        clubId: partidoJugadorSale.clubId,
        detalle: { jugadorEntraId, jugadorSaleId },
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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés registrar timeouts en este partido.");
    return;
  }

  if (clubId !== partido.clubLocalId && clubId !== partido.clubVisitanteId) {
    fail("Ese club no pertenece a este partido.");
    return;
  }

  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  if (estado.cuartoActivo === null) {
    fail("No hay un cuarto activo — iniciá el cuarto antes de registrar timeouts.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: estado.cuartoActivo,
      tipo: TipoEvento.TIMEOUT,
      clubId,
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=timeout`);
}

export async function registrarPosesion(formData: FormData) {
  const partidoId = String(formData.get("partidoId") ?? "");
  const clubId = String(formData.get("clubId") ?? "");

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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés cambiar la posesión de este partido.");
    return;
  }

  if (clubId !== partido.clubLocalId && clubId !== partido.clubVisitanteId) {
    fail("Ese club no pertenece a este partido.");
    return;
  }

  const eventos = await prisma.matchEvent.findMany({
    where: { partidoId, anulado: false },
    orderBy: { createdAt: "asc" },
    select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
  });
  const estado = buildLiveMatchState(eventos, {
    clubLocalId: partido.clubLocalId,
    clubVisitanteId: partido.clubVisitanteId,
  });

  if (estado.cuartoActivo === null) {
    fail("No hay un cuarto activo — iniciá el cuarto antes de cambiar la posesión.");
    return;
  }

  await prisma.matchEvent.create({
    data: {
      partidoId,
      cuarto: estado.cuartoActivo,
      tipo: TipoEvento.POSESION,
      clubId,
    },
  });

  redirect(`/mesa/partidos/${partidoId}?ok=posesion`);
}

export async function deshacerUltimoEvento(formData: FormData) {
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
  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario.id) {
    fail("No podés deshacer eventos de este partido.");
    return;
  }

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
