import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";

export default async function MesaPartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="max-w-sm text-center text-sm text-muted">
          Selección de convocados y titulares se implementa en los próximos
          PRs de Fase 2.
        </p>
      </div>
    </div>
  );
}
