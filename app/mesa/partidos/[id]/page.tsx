import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { ConvocadosForm } from "./convocados-form";
import { TitularesForm } from "./titulares-form";
import { NumerosCamisetaForm } from "./numeros-camiseta-form";
import { ConsolaPartido } from "./consola-partido";
import {
  buildLiveMatchState,
  calcularDesglosePuntosPorJugador,
  calcularDesgloseFaltasPorJugador,
} from "@/lib/mesa/live-match-state";
import { calcularRelojActual } from "@/lib/mesa/reloj";
import { leerReloj } from "@/lib/mesa/reloj-db";
import { Badge } from "@/components/ui/badge";
import { generarActa, guardarObservaciones } from "./actions";

export default async function MesaPartidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { jornada: true, clubLocal: true, clubVisitante: true, mesaOperador: true },
  });

  if (!partido) {
    redirect(`/mesa?error=${encodeURIComponent("Partido no encontrado.")}`);
  }

  const puedeVer =
    (partido.estado === "EN_CURSO" || partido.estado === "FINALIZADO") &&
    partido.mesaOperadorId === usuario!.id;
  if (!puedeVer) {
    redirect(
      `/mesa?error=${encodeURIComponent(
        partido.estado !== "EN_CURSO" && partido.estado !== "FINALIZADO"
          ? "Este partido todavía no fue abierto — usá el botón 'Abrir partido' desde la lista."
          : "Este partido está siendo operado por otro usuario de Mesa.",
      )}`,
    );
  }

  const partidoFinalizado = partido!.estado === "FINALIZADO";

  const acta = partidoFinalizado
    ? await prisma.acta.findUnique({ where: { partidoId: partido!.id } })
    : null;
  const boxscore = acta
    ? await prisma.jugadorPartidoStat.findMany({
        where: { partidoId: partido!.id, origen: "EVENTOS" },
        include: { jugador: { select: { nombre: true, numeroCamiseta: true } } },
        orderBy: [{ clubId: "asc" }, { puntos: "desc" }],
      })
    : [];

  const [jugadoresLocal, jugadoresVisitante, convocadosActuales, eventos] = await Promise.all([
    prisma.jugador.findMany({
      where: { clubId: partido!.clubLocalId, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroCamiseta: true },
    }),
    prisma.jugador.findMany({
      where: { clubId: partido!.clubVisitanteId, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroCamiseta: true },
    }),
    prisma.partidoJugador.findMany({
      where: { partidoId: partido!.id, presente: true },
      include: { jugador: { select: { id: true, nombre: true, numeroCamiseta: true } } },
    }),
    prisma.matchEvent.findMany({
      where: { partidoId: partido!.id, anulado: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
    }),
  ]);

  const liveState = buildLiveMatchState(eventos, {
    clubLocalId: partido!.clubLocalId,
    clubVisitanteId: partido!.clubVisitanteId,
  });

  // Desgloses solo para el Acta oficial (1P/2P/3P y FP/FO/FT/FA/FD/EXP) —
  // baratos de calcular siempre (funciones puras sobre datos ya fetcheados),
  // pero solo se usan en el JSX cuando `acta` existe. eventos ya viene
  // filtrado anulado:false desde la query, igual que exige el acta.
  const desglosePuntos = calcularDesglosePuntosPorJugador(eventos);
  const desgloseFaltas = calcularDesgloseFaltasPorJugador(liveState.tiposFaltaPorJugador, liveState.faltasPorJugador);

  // Reloj: se recalcula server-side en CADA carga de la página (post-redirect
  // de cualquier acción incluido) — nunca se confía en un estado de cliente
  // que sobreviva entre requests. Ver lib/mesa/reloj.ts.
  const relojDb = partidoFinalizado ? null : await leerReloj(partido!.id);
  const relojInicial = relojDb
    ? calcularRelojActual(relojDb, new Date())
    : { estado: "PAUSADO" as const, remainingSeconds: partido!.duracionCuartoMinutos * 60, clockLabel: "10:00" };

  const seleccionadosLocalInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId)
    .map((c) => c.jugadorId);
  const seleccionadosVisitanteInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId)
    .map((c) => c.jugadorId);

  const convocadosLocal = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId)
    .map((c) => c.jugador);
  const convocadosVisitante = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId)
    .map((c) => c.jugador);
  const titularesLocalInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId && c.titular)
    .map((c) => c.jugadorId);
  const titularesVisitanteInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId && c.titular)
    .map((c) => c.jugadorId);

  // La cancha sale de enCancha (estado operativo tras sustituciones), no de
  // titular — divergen apenas se registra la primera sustitución del partido.
  // Este mapa alimenta describirEvento() SOLO para el "último evento"/Deshacer
  // de Mesa — el dorsal se antepone acá para que la Mesa vea "#7 Juan Pérez"
  // en sustituciones y jugadas. lib/public/live-page-data.ts construye su
  // PROPIO mapa (solo nombre) para /en-vivo, así que esto no afecta al sitio
  // público — ahí el foco explícitamente debe quedar en el nombre.
  const nombresJugadores = new Map(
    convocadosActuales.map((c) => [
      c.jugadorId,
      c.jugador.numeroCamiseta !== null ? `#${c.jugador.numeroCamiseta} ${c.jugador.nombre}` : c.jugador.nombre,
    ]),
  );

  const canchaLocal = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId && c.enCancha)
    .map((c) => c.jugador);
  const canchaVisitante = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId && c.enCancha)
    .map((c) => c.jugador);
  const bancaLocal = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId && !c.enCancha)
    .map((c) => c.jugador);
  const bancaVisitante = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId && !c.enCancha)
    .map((c) => c.jugador);

  // Editor "Corregir jugadas recientes" (Mesa 3.2): últimas 8 jugadas
  // vigentes, más reciente primero. eventos ya viene filtrado anulado:false
  // desde la query, así que no hace falta re-filtrar acá.
  const eventosRecientes = [...eventos].slice(-8).reverse();

  const sinConvocados = convocadosLocal.length === 0 && convocadosVisitante.length === 0;
  const faltanTitulares =
    !sinConvocados &&
    (titularesLocalInicial.length !== 5 || titularesVisitanteInicial.length !== 5);

  const consolaLista = !sinConvocados && !faltanTitulares;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={partidoFinalizado ? "neutral" : "accent-orange"} live={!partidoFinalizado}>
          Jornada {partido!.jornada.numero} — {partidoFinalizado ? "Finalizado" : "En curso"}
        </Badge>
        <span className="text-xs text-muted">
          Operador: {partido!.mesaOperador?.email ?? "—"}
        </span>
      </div>

      {!consolaLista && (
        <div className="flex items-center justify-between text-lg font-medium text-foreground">
          <span>{partido!.clubLocal.nombre}</span>
          <span className="text-sm text-muted">vs</span>
          <span>{partido!.clubVisitante.nombre}</span>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {ok === "numero" && <p className="text-sm text-success">Número de camiseta actualizado.</p>}
      {ok === "convocados" && <p className="text-sm text-success">Convocados guardados.</p>}
      {ok === "titulares" && <p className="text-sm text-success">Titulares guardados.</p>}
      {ok === "cuarto" && <p className="text-sm text-success">Cuarto actualizado.</p>}
      {ok === "punto" && <p className="text-sm text-success">Punto registrado.</p>}
      {ok === "falta" && <p className="text-sm text-success">Falta registrada.</p>}
      {ok === "sustitucion" && <p className="text-sm text-success">Sustitución registrada.</p>}
      {ok === "timeout" && <p className="text-sm text-success">Timeout registrado.</p>}
      {ok === "posesion" && <p className="text-sm text-success">Posesión actualizada.</p>}
      {ok === "deshacer" && <p className="text-sm text-success">Último evento deshecho.</p>}
      {ok === "punto_editado" && <p className="text-sm text-success">Punto corregido.</p>}
      {ok === "falta_editada" && <p className="text-sm text-success">Falta corregida.</p>}
      {ok === "anulado" && <p className="text-sm text-success">Jugada anulada.</p>}
      {ok === "finalizado" && (
        <p className="text-sm text-success">Partido finalizado. Listo para generar Acta.</p>
      )}
      {ok === "acta" && <p className="text-sm text-success">Acta generada.</p>}
      {ok === "observaciones" && <p className="text-sm text-success">Observaciones guardadas.</p>}

      {sinConvocados && (
        <div className="rounded-lg border border-dashed border-accent-orange/50 bg-accent-orange/10 p-4 text-sm text-accent-orange">
          Primero selecciona convocados para poder armar la cancha.
        </div>
      )}
      {faltanTitulares && (
        <div className="rounded-lg border border-dashed border-accent-orange/50 bg-accent-orange/10 p-4 text-sm text-accent-orange">
          Ahora selecciona titulares (5 por equipo) para poder armar la cancha.
        </div>
      )}
      {partidoFinalizado && (
        <div className="flex animate-fade-in flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Partido finalizado.
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                acta ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              {acta ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3l9 16H3z" />
                </svg>
              )}
            </span>
            <Badge tone={acta ? "success" : "warning"}>
              {acta ? "Acta oficial" : "Acta pendiente"}
            </Badge>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <span className="max-w-[8rem] truncate text-right text-sm font-medium text-muted sm:max-w-none sm:text-base">
              {partido!.clubLocal.nombre}
            </span>
            <span className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-6xl">
              {acta ? acta.resultadoLocal : liveState.marcadorLocal}
              <span className="px-2 text-muted">-</span>
              {acta ? acta.resultadoVisitante : liveState.marcadorVisitante}
            </span>
            <span className="max-w-[8rem] truncate text-sm font-medium text-muted sm:max-w-none sm:text-base">
              {partido!.clubVisitante.nombre}
            </span>
          </div>

          {!acta && (
            <>
              <p className="text-sm text-muted">
                El partido está finalizado. Falta generar Acta oficial.
              </p>
              <form action={generarActa}>
                <input type="hidden" name="partidoId" value={partido!.id} />
                <button
                  type="submit"
                  className="rounded-full bg-accent-blue px-5 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-95"
                >
                  Generar Acta
                </button>
              </form>
            </>
          )}

          {acta && (
            <>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                {[partido!.clubLocalId, partido!.clubVisitanteId].map((clubId) => (
                  <div
                    key={clubId}
                    className="flex flex-col gap-1 overflow-hidden rounded-lg border border-border"
                  >
                    <h3 className="bg-surface-hover px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      {clubId === partido!.clubLocalId
                        ? partido!.clubLocal.nombre
                        : partido!.clubVisitante.nombre}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border text-[9px] uppercase tracking-wide text-muted">
                            <th className="py-1 pl-3 text-left font-semibold">Jugador</th>
                            <th className="px-1 py-1 text-right font-semibold">1P</th>
                            <th className="px-1 py-1 text-right font-semibold">2P</th>
                            <th className="px-1 py-1 text-right font-semibold">3P</th>
                            <th className="px-1 py-1 text-right font-semibold text-accent-blue">PTS</th>
                            <th className="px-1 py-1 text-right font-semibold">FP</th>
                            <th className="px-1 py-1 text-right font-semibold">FO</th>
                            <th className="px-1 py-1 text-right font-semibold">FT</th>
                            <th className="px-1 py-1 text-right font-semibold">FA</th>
                            <th className="px-1 py-1 text-right font-semibold">FD</th>
                            <th className="px-1 py-1 text-right font-semibold">EXP</th>
                            <th className="py-1 pr-3 text-right font-semibold text-warning">F</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boxscore
                            .filter((s) => s.clubId === clubId)
                            .map((s, i) => {
                              const p = desglosePuntos.get(s.jugadorId) ?? { p1: 0, p2: 0, p3: 0, total: 0 };
                              const f = desgloseFaltas.get(s.jugadorId) ?? {
                                personal: 0,
                                ofensiva: 0,
                                tecnica: 0,
                                antideportiva: 0,
                                descalificante: 0,
                                expulsion: 0,
                                total: 0,
                              };
                              return (
                                <tr
                                  key={s.jugadorId}
                                  className={i % 2 === 1 ? "bg-surface-hover/60" : ""}
                                >
                                  <td className="py-1.5 pl-3 whitespace-nowrap text-foreground">
                                    {s.jugador.numeroCamiseta !== null ? `#${s.jugador.numeroCamiseta} ` : ""}
                                    {s.jugador.nombre}
                                  </td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{p.p1}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{p.p2}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{p.p3}</td>
                                  <td className="px-1 py-1.5 text-right font-semibold tabular-nums text-accent-blue">
                                    {s.puntos}
                                  </td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.personal}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.ofensiva}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.tecnica}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.antideportiva}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.descalificante}</td>
                                  <td className="px-1 py-1.5 text-right tabular-nums text-muted">{f.expulsion}</td>
                                  <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-warning">
                                    {s.faltas ?? 0}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor="observaciones"
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Observaciones del partido
                </label>
                <form action={guardarObservaciones} className="flex flex-col gap-2">
                  <input type="hidden" name="partidoId" value={partido!.id} />
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    defaultValue={acta.observacionesMesa ?? ""}
                    rows={3}
                    placeholder="Anota aquí situaciones relevantes del partido, aclaraciones de mesa, reclamos, incidencias o comentarios oficiales."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    className="self-end rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted hover:bg-surface-hover active:scale-95"
                  >
                    Guardar observaciones
                  </button>
                </form>
              </div>
            </>
          )}

          <Link
            href="/mesa"
            className="rounded-full border border-border px-6 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover active:scale-95"
          >
            Inicio
          </Link>
        </div>
      )}

      {!partidoFinalizado && consolaLista && (
        <ConsolaPartido
          partidoId={partido!.id}
          clubLocalId={partido!.clubLocalId}
          clubVisitanteId={partido!.clubVisitanteId}
          clubLocalNombre={partido!.clubLocal.nombre}
          clubVisitanteNombre={partido!.clubVisitante.nombre}
          canchaLocal={canchaLocal}
          canchaVisitante={canchaVisitante}
          bancaLocal={bancaLocal}
          bancaVisitante={bancaVisitante}
          convocadosLocal={convocadosLocal}
          convocadosVisitante={convocadosVisitante}
          liveState={liveState}
          nombresJugadores={nombresJugadores}
          duracionCuartoMinutos={partido!.duracionCuartoMinutos}
          relojInicial={relojInicial}
          eventosRecientes={eventosRecientes}
        />
      )}

      {!partidoFinalizado && (
        <>
          <details className="rounded-lg border border-border bg-surface">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-foreground">
              Editar números de camiseta
            </summary>
            <div className="px-4 pb-4">
              <NumerosCamisetaForm
                partidoId={partido!.id}
                clubLocalNombre={partido!.clubLocal.nombre}
                clubVisitanteNombre={partido!.clubVisitante.nombre}
                jugadoresLocal={jugadoresLocal}
                jugadoresVisitante={jugadoresVisitante}
              />
            </div>
          </details>

          <details className="rounded-lg border border-border bg-surface" open={!consolaLista}>
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-foreground">
              Editar convocados (máximo 12 por equipo)
            </summary>
            <div className="px-4 pb-4">
              <ConvocadosForm
                partidoId={partido!.id}
                clubLocalNombre={partido!.clubLocal.nombre}
                clubVisitanteNombre={partido!.clubVisitante.nombre}
                jugadoresLocal={jugadoresLocal}
                jugadoresVisitante={jugadoresVisitante}
                seleccionadosLocalInicial={seleccionadosLocalInicial}
                seleccionadosVisitanteInicial={seleccionadosVisitanteInicial}
              />
            </div>
          </details>

          <details className="rounded-lg border border-border bg-surface" open={!sinConvocados && !consolaLista}>
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-foreground">
              Editar titulares (5 por equipo, entre los convocados)
            </summary>
            <div className="px-4 pb-4">
              <TitularesForm
                partidoId={partido!.id}
                clubLocalNombre={partido!.clubLocal.nombre}
                clubVisitanteNombre={partido!.clubVisitante.nombre}
                convocadosLocal={convocadosLocal}
                convocadosVisitante={convocadosVisitante}
                titularesLocalInicial={titularesLocalInicial}
                titularesVisitanteInicial={titularesVisitanteInicial}
              />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
