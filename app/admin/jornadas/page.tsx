import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatFechaCL } from "@/lib/fecha";

export default async function JornadasPage() {
  const jornadas = await prisma.jornada.findMany({
    orderBy: { numero: "asc" },
    include: { partidos: { select: { estado: true } } },
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Jornadas</h1>
        <p className="text-sm text-muted">{jornadas.length} jornadas del fixture.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jornadas.map((jornada) => {
          const finalizados = jornada.partidos.filter((p) => p.estado === "FINALIZADO").length;
          const programados = jornada.partidos.filter((p) => p.estado === "PROGRAMADO").length;
          const otros = jornada.partidos.length - finalizados - programados;

          return (
            <Link
              key={jornada.id}
              href={`/admin/jornadas/${jornada.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  Jornada {jornada.numero}
                </span>
                <span className="text-xs text-muted">
                  {jornada.partidos.length} partidos
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {finalizados > 0 && (
                  <Badge tone="success">
                    {finalizados} finalizado{finalizados !== 1 ? "s" : ""}
                  </Badge>
                )}
                {programados > 0 && (
                  <Badge tone="neutral">
                    {programados} programado{programados !== 1 ? "s" : ""}
                  </Badge>
                )}
                {otros > 0 && (
                  <Badge tone="accent-blue">{otros} en otro estado</Badge>
                )}
              </div>

              <span className="text-xs text-muted">
                {jornada.fecha ? formatFechaCL(jornada.fecha) : "Sin fecha real todavía"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
