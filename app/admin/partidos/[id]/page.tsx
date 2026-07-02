import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { estadoPartidoBadge } from "@/lib/estado-partido";
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
        className="text-sm text-muted hover:text-foreground"
      >
        ← Jornada {partido.jornada.numero}
      </Link>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
        <span className={`w-fit rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
          {badge.label}
        </span>

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            {partido.clubLocal.nombre}
          </span>
          <span className="text-lg font-semibold text-foreground">
            {partido.acta ? partido.acta.resultadoLocal : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            {partido.clubVisitante.nombre}
          </span>
          <span className="text-lg font-semibold text-foreground">
            {partido.acta ? partido.acta.resultadoVisitante : "—"}
          </span>
        </div>

        {partido.acta?.mvpJugador && (
          <p className="text-sm text-muted">MVP: {partido.acta.mvpJugador.nombre}</p>
        )}
      </div>

      <div className="flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {ok && <p className="text-sm text-green-400">Partido confirmado.</p>}

        {partido.estado === "PROGRAMADO" && (
          <form action={confirmarPartido} className="flex flex-col gap-2">
            <input type="hidden" name="partidoId" value={partido.id} />
            <p className="text-sm text-muted">
              Confirmar habilita este partido para que la Mesa pueda operarlo.
            </p>
            <button
              type="submit"
              className="w-fit rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
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
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6">
          <p className="text-center text-sm text-muted">
            Sin estadísticas cargadas para este partido todavía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {partido.clubLocal.nombre}
            </h2>
            {statsLocal.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted">{s.jugador.nombre}</span>
                <span className="text-foreground">{s.puntos} pts</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {partido.clubVisitante.nombre}
            </h2>
            {statsVisitante.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted">{s.jugador.nombre}</span>
                <span className="text-foreground">{s.puntos} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
