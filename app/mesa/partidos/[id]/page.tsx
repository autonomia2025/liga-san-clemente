import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { ConvocadosForm } from "./convocados-form";

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
      select: { jugadorId: true, clubId: true },
    }),
  ]);

  const seleccionadosLocalInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubLocalId)
    .map((c) => c.jugadorId);
  const seleccionadosVisitanteInicial = convocadosActuales
    .filter((c) => c.clubId === partido!.clubVisitanteId)
    .map((c) => c.jugadorId);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <span className="w-fit rounded-full bg-accent-orange/20 px-2 py-0.5 text-xs text-accent-orange">
        Jornada {partido!.jornada.numero} — En curso
      </span>

      <div className="flex items-center justify-between text-lg font-medium text-foreground">
        <span>{partido!.clubLocal.nombre}</span>
        <span className="text-sm text-muted">vs</span>
        <span>{partido!.clubVisitante.nombre}</span>
      </div>

      <p className="text-sm text-muted">
        Operador: {partido!.mesaOperador?.email ?? "—"}
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok && <p className="text-sm text-green-400">Convocados guardados.</p>}

      <h2 className="text-sm font-semibold text-foreground">Convocados (máximo 12 por equipo)</h2>

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
  );
}
