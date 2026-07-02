import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function ActasPage() {
  const actas = await prisma.acta.findMany({
    include: {
      partido: { include: { clubLocal: true, clubVisitante: true, jornada: true } },
      mvpJugador: true,
    },
    orderBy: { generadaAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Actas</h1>
        <p className="text-sm text-muted">
          {actas.length} acta{actas.length !== 1 ? "s" : ""} oficial{actas.length !== 1 ? "es" : ""}{" "}
          generada{actas.length !== 1 ? "s" : ""} por Mesa.
        </p>
      </div>

      {actas.length === 0 ? (
        <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border p-6">
          <p className="max-w-sm text-center text-sm text-muted">
            Todavía no hay actas generadas. Se crean desde Mesa al cerrar un partido finalizado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actas.map((acta) => (
            <Link
              key={acta.id}
              href={`/admin/partidos/${acta.partidoId}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Jornada {acta.partido.jornada.numero}</span>
                <Badge tone="success">Acta oficial</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{acta.partido.clubLocal.nombre}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {acta.resultadoLocal}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{acta.partido.clubVisitante.nombre}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {acta.resultadoVisitante}
                </span>
              </div>
              {acta.mvpJugador && (
                <span className="text-xs text-muted">MVP: {acta.mvpJugador.nombre}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
