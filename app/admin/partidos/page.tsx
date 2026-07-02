import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { estadoPartidoBadge } from "@/lib/estado-partido";

export default async function PartidosPage() {
  const partidos = await prisma.partido.findMany({
    include: { clubLocal: true, clubVisitante: true, jornada: true, acta: true },
    orderBy: [{ jornada: { numero: "asc" } }, { createdAt: "asc" }],
  });

  const porJornada = new Map<number, typeof partidos>();
  for (const p of partidos) {
    const lista = porJornada.get(p.jornada.numero) ?? [];
    lista.push(p);
    porJornada.set(p.jornada.numero, lista);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Partidos</h1>
        <p className="text-sm text-muted">{partidos.length} partidos del fixture.</p>
      </div>

      {partidos.length === 0 ? (
        <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border p-6">
          <p className="max-w-sm text-center text-sm text-muted">
            Todavía no hay partidos cargados. Se crean al importar el fixture.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porJornada.entries()].map(([numero, partidosJornada]) => (
            <div key={numero} className="flex flex-col gap-2">
              <Link
                href={`/admin/jornadas/${partidosJornada[0].jornadaId}`}
                className="w-fit text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:text-accent-blue"
              >
                Jornada {numero}
              </Link>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {partidosJornada.map((partido) => {
                  const badge = estadoPartidoBadge(partido.estado);
                  return (
                    <Link
                      key={partido.id}
                      href={`/admin/partidos/${partido.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-surface-hover"
                    >
                      <Badge tone={badge.tone} live={badge.live}>
                        {badge.label}
                      </Badge>
                      <div className="flex items-center justify-between text-sm">
                        <span className="min-w-0 truncate text-foreground">
                          {partido.clubLocal.nombre}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {partido.acta ? partido.acta.resultadoLocal : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="min-w-0 truncate text-foreground">
                          {partido.clubVisitante.nombre}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {partido.acta ? partido.acta.resultadoVisitante : "—"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
