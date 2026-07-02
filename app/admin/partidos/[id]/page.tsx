import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { estadoPartidoBadge } from "@/lib/estado-partido";
import { Badge } from "@/components/ui/badge";
import { confirmarPartido } from "./actions";

export default async function PartidoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: {
      jornada: true,
      clubLocal: true,
      clubVisitante: true,
      acta: { include: { mvpJugador: true } },
      jugadorStats: {
        include: { jugador: true },
        orderBy: { puntos: "desc" },
      },
    },
  });

  if (!partido) notFound();

  const badge = estadoPartidoBadge(partido.estado);
  const statsLocal = partido.jugadorStats.filter((s) => s.clubId === partido.clubLocalId);
  const statsVisitante = partido.jugadorStats.filter((s) => s.clubId === partido.clubVisitanteId);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link
        href={`/admin/jornadas/${partido.jornadaId}`}
        className="w-fit text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Jornada {partido.jornada.numero}
      </Link>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <Badge tone={badge.tone} live={badge.live}>
          {badge.label}
        </Badge>

        <div className="flex items-center gap-4 sm:gap-6">
          <span className="max-w-[9rem] truncate text-right text-sm font-medium text-muted sm:max-w-none sm:text-base">
            {partido.clubLocal.nombre}
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-5xl">
            {partido.acta ? partido.acta.resultadoLocal : "—"}
            <span className="px-2 text-muted">-</span>
            {partido.acta ? partido.acta.resultadoVisitante : "—"}
          </span>
          <span className="max-w-[9rem] truncate text-sm font-medium text-muted sm:max-w-none sm:text-base">
            {partido.clubVisitante.nombre}
          </span>
        </div>

        {partido.acta?.mvpJugador && (
          <Badge tone="accent-orange">MVP · {partido.acta.mvpJugador.nombre}</Badge>
        )}
      </div>

      <div className="flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">Partido confirmado.</p>}

        {partido.estado === "PROGRAMADO" && (
          <form action={confirmarPartido} className="flex flex-col gap-2">
            <input type="hidden" name="partidoId" value={partido.id} />
            <p className="text-sm text-muted">
              Confirmar habilita este partido para que la Mesa pueda operarlo.
            </p>
            <button
              type="submit"
              className="w-fit rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
            >
              Confirmar partido para Mesa
            </button>
          </form>
        )}

        {partido.estado === "CONFIRMADO" && (
          <p className="text-sm text-accent-blue">Listo para Mesa.</p>
        )}
      </div>

      {partido.jugadorStats.length === 0 ? (
        <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border p-6">
          <p className="text-center text-sm text-muted">
            Sin estadísticas cargadas para este partido todavía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { club: partido.clubLocal, stats: statsLocal },
            { club: partido.clubVisitante, stats: statsVisitante },
          ].map(({ club, stats }) => (
            <div
              key={club.id}
              className="flex flex-col gap-1 overflow-hidden rounded-lg border border-border"
            >
              <h2 className="bg-surface-hover px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                {club.nombre}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {stats.map((s, i) => (
                      <tr key={s.id} className={i % 2 === 1 ? "bg-surface-hover/60" : ""}>
                        <td className="py-1.5 pl-3 whitespace-nowrap text-foreground">
                          {s.jugador.numeroCamiseta !== null ? `#${s.jugador.numeroCamiseta} ` : ""}
                          {s.jugador.nombre}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-medium text-accent-blue">
                          {s.puntos} pts
                        </td>
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
  );
}
