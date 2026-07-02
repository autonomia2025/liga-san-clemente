import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { ConvocadosForm } from "./convocados-form";
import { TitularesForm } from "./titulares-form";
import { ConsolaPartido } from "./consola-partido";

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

  if (partido.estado !== "EN_CURSO" || partido.mesaOperadorId !== usuario!.id) {
    redirect(
      `/mesa?error=${encodeURIComponent(
        partido.estado !== "EN_CURSO"
          ? "Este partido todavía no fue abierto — usá el botón 'Abrir partido' desde la lista."
          : "Este partido está siendo operado por otro usuario de Mesa.",
      )}`,
    );
  }

  const [jugadoresLocal, jugadoresVisitante, convocadosActuales] = await Promise.all([
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
  ]);

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
        <span className="w-fit rounded-full bg-accent-orange/20 px-2 py-0.5 text-xs text-accent-orange">
          Jornada {partido!.jornada.numero} — En curso
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
      {consolaLista && (
        <ConsolaPartido
          clubLocalNombre={partido!.clubLocal.nombre}
          clubVisitanteNombre={partido!.clubVisitante.nombre}
          canchaLocal={canchaLocal}
          canchaVisitante={canchaVisitante}
          bancaLocal={bancaLocal}
          bancaVisitante={bancaVisitante}
        />
      )}

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
    </div>
  );
}
