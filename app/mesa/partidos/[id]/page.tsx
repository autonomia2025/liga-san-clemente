import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { ConvocadosForm } from "./convocados-form";
import { TitularesForm } from "./titulares-form";
import { ConsolaPartido } from "./consola-partido";
import { buildLiveMatchState } from "@/lib/mesa/live-match-state";

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

  // La cancha sale de enCancha (estado operativo), no de titular directamente
  // — son iguales recién ahora, pero van a divergir cuando existan sustituciones.
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
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-xs ${
            partidoFinalizado
              ? "bg-zinc-500/20 text-muted"
              : "bg-accent-orange/20 text-accent-orange"
          }`}
        >
          Jornada {partido!.jornada.numero} — {partidoFinalizado ? "Finalizado" : "En curso"}
        </span>
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

      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok === "convocados" && <p className="text-sm text-green-400">Convocados guardados.</p>}
      {ok === "titulares" && <p className="text-sm text-green-400">Titulares guardados.</p>}
      {ok === "cuarto" && <p className="text-sm text-green-400">Cuarto actualizado.</p>}
      {ok === "punto" && <p className="text-sm text-green-400">Punto registrado.</p>}
      {ok === "falta" && <p className="text-sm text-green-400">Falta registrada.</p>}
      {ok === "sustitucion" && <p className="text-sm text-green-400">Sustitución registrada.</p>}
      {ok === "timeout" && <p className="text-sm text-green-400">Timeout registrado.</p>}
      {ok === "posesion" && <p className="text-sm text-green-400">Posesión actualizada.</p>}
      {ok === "deshacer" && <p className="text-sm text-green-400">Último evento deshecho.</p>}
      {ok === "finalizado" && (
        <p className="text-sm text-green-400">Partido finalizado. Listo para generar Acta.</p>
      )}

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
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Marcador final
          </span>
          <div className="flex items-center gap-3 text-2xl font-extrabold text-foreground">
            <span>{partido!.clubLocal.nombre}</span>
            <span>
              {liveState.marcadorLocal}&nbsp;-&nbsp;{liveState.marcadorVisitante}
            </span>
            <span>{partido!.clubVisitante.nombre}</span>
          </div>
          <p className="text-sm text-muted">Partido finalizado. Listo para generar Acta.</p>
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
