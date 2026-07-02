import { prisma } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { formatFechaHoraCL } from "@/lib/fecha";
import { abrirPartido } from "./actions";

export default async function MesaHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const usuario = await getCurrentUsuario();

  // Incluye también los partidos EN_CURSO que este operador ya abrió: sin
  // esto, un operador que cierra la pestaña o navega hacia atrás no tiene
  // forma de volver a su partido en vivo salvo que recuerde la URL. Ojo:
  // mesaOperadorId debe ir siempre con un id concreto — pasarle `undefined`
  // a Prisma hace que ignore el filtro y traiga el EN_CURSO de cualquiera.
  const partidos = await prisma.partido.findMany({
    where: usuario
      ? { OR: [{ estado: "CONFIRMADO" }, { estado: "EN_CURSO", mesaOperadorId: usuario.id }] }
      : { estado: "CONFIRMADO" },
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
        <div className="flex flex-1 animate-fade-in items-center justify-center rounded-lg border border-dashed border-border">
          <p className="max-w-sm text-center text-sm text-muted">
            Todavía no hay partidos confirmados para operar. Cuando el Admin
            confirme un partido, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {partidos.map((partido) => {
            const enCurso = partido.estado === "EN_CURSO";
            return (
              <div
                key={partido.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-orange/40"
              >
                <Badge tone={enCurso ? "success" : "accent-orange"} live={enCurso}>
                  Jornada {partido.jornada.numero}
                  {enCurso ? " — En curso" : ""}
                </Badge>

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
                  {partido.fechaHora ? formatFechaHoraCL(partido.fechaHora) : "Sin fecha definida"}
                </span>

                <form action={abrirPartido}>
                  <input type="hidden" name="partidoId" value={partido.id} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-accent-orange px-3 py-3 text-sm font-medium text-white hover:opacity-90"
                  >
                    {enCurso ? "Continuar operando" : "Abrir partido"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
