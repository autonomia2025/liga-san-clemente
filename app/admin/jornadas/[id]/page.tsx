import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { estadoPartidoBadge } from "@/lib/estado-partido";

export default async function JornadaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const jornada = await prisma.jornada.findUnique({
    where: { id },
    include: {
      partidos: {
        include: {
          clubLocal: true,
          clubVisitante: true,
          acta: { include: { mvpJugador: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!jornada) notFound();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link href="/admin/jornadas" className="text-sm text-muted hover:text-foreground">
        ← Jornadas
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Jornada {jornada.numero}</h1>
        <p className="text-sm text-muted">
          {jornada.fecha
            ? new Date(jornada.fecha).toLocaleDateString("es-CL")
            : "Sin fecha real todavía"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {jornada.partidos.map((partido) => {
          const badge = estadoPartidoBadge(partido.estado);
          const finalizado = partido.estado === "FINALIZADO" && partido.acta;

          return (
            <Link
              key={partido.id}
              href={`/admin/partidos/${partido.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover"
            >
              <span className={`w-fit rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                {badge.label}
              </span>

              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{partido.clubLocal.nombre}</span>
                {finalizado ? (
                  <span className="font-semibold text-foreground">
                    {partido.acta!.resultadoLocal}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{partido.clubVisitante.nombre}</span>
                {finalizado ? (
                  <span className="font-semibold text-foreground">
                    {partido.acta!.resultadoVisitante}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>

              {finalizado && partido.acta!.mvpJugador && (
                <span className="text-xs text-muted">
                  MVP: {partido.acta!.mvpJugador.nombre}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
