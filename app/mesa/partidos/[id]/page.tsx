import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { ConvocadosForm } from "./convocados-form";
import { TitularesForm } from "./titulares-form";
import { ConsolaPartido } from "./consola-partido";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";
import { Badge } from "@/components/ui/badge";
import { generarActa } from "./actions";

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
      select: { tipo: true, cuarto: true, anulado: true, jugadorId: true, clubId: true, detalle: true },
    }),
  ]);

  const liveState = buildLiveMatchState(eventos, {
    clubLocalId: partido!.clubLocalId,
    clubVisitanteId: partido!.clubVisitanteId,
  });

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
  const nombresJugadores = new Map(convocadosActuales.map((c) => [c.jugadorId, c.jugador.nombre]));

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
      {ok === "convocados" && <p className="text-sm text-success">Convocados guardados.</p>}
      {ok === "titulares" && <p className="text-sm text-success">Titulares guardados.</p>}
      {ok === "cuarto" && <p className="text-sm text-success">Cuarto actualizado.</p>}
      {ok === "punto" && <p className="text-sm text-success">Punto registrado.</p>}
      {ok === "falta" && <p className="text-sm text-success">Falta registrada.</p>}
      {ok === "sustitucion" && <p className="text-sm text-success">Sustitución registrada.</p>}
      {ok === "timeout" && <p className="text-sm text-success">Timeout registrado.</p>}
      {ok === "posesion" && <p className="text-sm text-success">Posesión actualizada.</p>}
      {ok === "deshacer" && <p className="text-sm text-success">Último evento deshecho.</p>}
      {ok === "finalizado" && (
        <p className="text-sm text-success">Partido finalizado. Listo para generar Acta.</p>
      )}
      {ok === "acta" && <p className="text-sm text-success">Acta generada.</p>}

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
                    <table className="w-full text-xs">
                      <tbody>
                        {boxscore
                          .filter((s) => s.clubId === clubId)
                          .map((s, i) => (
                            <tr
                              key={s.jugadorId}
                              className={i % 2 === 1 ? "bg-surface-hover/60" : ""}
                            >
                              <td className="py-1.5 pl-3 whitespace-nowrap text-foreground">
                                {s.jugador.numeroCamiseta !== null ? `#${s.jugador.numeroCamiseta} ` : ""}
                                {s.jugador.nombre}
                              </td>
                              <td className="py-1.5 text-right text-accent-blue">{s.puntos} pts</td>
                              <td className="py-1.5 pr-3 text-right text-warning">{s.faltas ?? 0} f</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          liveState={liveState}
          nombresJugadores={nombresJugadores}
        />
      )}

      {!partidoFinalizado && (
        <>
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
