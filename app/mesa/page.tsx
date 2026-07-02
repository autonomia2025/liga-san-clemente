import { prisma } from "@/lib/db";
import { abrirPartido } from "./actions";

export default async function MesaHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const partidos = await prisma.partido.findMany({
    where: { estado: "CONFIRMADO" },
    include: { jornada: true, clubLocal: true, clubVisitante: true },
    orderBy: [{ jornada: { numero: "asc" } }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        Partidos disponibles para operar
      </h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {partidos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="max-w-sm text-center text-sm text-muted">
            Todavía no hay partidos confirmados para operar. Cuando el Admin
            confirme un partido, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {partidos.map((partido) => (
            <div
              key={partido.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
            >
              <span className="w-fit rounded-full bg-accent-orange/20 px-2 py-0.5 text-xs text-accent-orange">
                Jornada {partido.jornada.numero}
              </span>

              <div className="flex items-center justify-between text-base">
                <span className="font-medium text-foreground">
                  {partido.clubLocal.nombre}
                </span>
                <span className="text-sm text-muted">vs</span>
                <span className="font-medium text-foreground">
                  {partido.clubVisitante.nombre}
                </span>
              </div>

              <span className="text-sm text-muted">
                {partido.fechaHora
                  ? new Date(partido.fechaHora).toLocaleString("es-CL")
                  : "Sin fecha definida"}
              </span>

              <form action={abrirPartido}>
                <input type="hidden" name="partidoId" value={partido.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-accent-orange px-3 py-3 text-sm font-medium text-white hover:opacity-90"
                >
                  Abrir partido
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
