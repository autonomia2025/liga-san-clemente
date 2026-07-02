import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function FixturePage() {
  const jornadas = await prisma.jornada.findMany({
    orderBy: { numero: "asc" },
    include: { partidos: { select: { estado: true } } },
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Fixture</h1>
        <p className="text-sm text-muted">
          {jornadas.length} jornada{jornadas.length !== 1 ? "s" : ""} cargada
          {jornadas.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {jornadas.length === 0 ? (
        <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border p-6">
          <p className="max-w-sm text-center text-sm text-muted">
            Todavía no hay jornadas cargadas. El fixture se carga por importación.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {jornadas.map((jornada) => {
            const finalizados = jornada.partidos.filter((p) => p.estado === "FINALIZADO").length;
            return (
              <Link
                key={jornada.id}
                href={`/admin/jornadas/${jornada.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 text-sm font-bold text-accent-blue">
                    {jornada.numero}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      Jornada {jornada.numero}
                    </span>
                    <span className="text-xs text-muted">
                      {jornada.fecha
                        ? new Date(jornada.fecha).toLocaleDateString("es-CL")
                        : "Sin fecha real todavía"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {jornada.partidos.length} partido{jornada.partidos.length !== 1 ? "s" : ""}
                  </span>
                  {finalizados > 0 && (
                    <Badge tone="success">
                      {finalizados}/{jornada.partidos.length} finalizados
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
