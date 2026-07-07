import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { DeleteJugadorButton } from "@/components/admin/delete-jugador-button";
import { createJugador, updateNumeroCamiseta, toggleActivoJugador, deleteJugadorSiSePuede } from "@/lib/actions/jugadores";

export default async function NominaClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id: clubId } = await params;
  const { error, ok } = await searchParams;

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();

  const jugadores = await prisma.jugador.findMany({
    where: { clubId },
    orderBy: [{ activo: "desc" }, { numeroCamiseta: "asc" }, { nombre: "asc" }],
  });

  const returnTo = `/admin/clubes/${clubId}/jugadores`;
  const activos = jugadores.filter((j) => j.activo).length;
  const inactivos = jugadores.length - activos;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link href={`/admin/clubes/${clubId}`} className="w-fit text-sm text-muted transition-colors hover:text-foreground">
        ← {club.nombre}
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Nómina del equipo — {club.nombre}</h1>
        <p className="text-sm text-muted">
          {activos} activos, {inactivos} inactivos.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {ok === "creado" && <p className="text-sm text-success">Jugador creado.</p>}
      {ok === "numero" && <p className="text-sm text-success">Número actualizado.</p>}
      {ok === "estado" && <p className="text-sm text-success">Estado actualizado.</p>}
      {ok === "eliminado" && <p className="text-sm text-success">Jugador eliminado.</p>}

      <form
        action={createJugador}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      >
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <label className="flex flex-col gap-1 text-sm text-muted">
          Nombre
          <input
            name="nombre"
            type="text"
            required
            placeholder="Nombre y apellido"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Número
          <input
            name="numeroCamiseta"
            type="number"
            min={0}
            max={99}
            placeholder="Opcional"
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          Agregar jugador
        </button>
      </form>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {jugadores.map((j) => (
          <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{j.nombre}</span>
              <Link
                href={`/admin/jugadores/${j.id}`}
                className="w-fit text-xs text-muted underline transition-colors hover:text-foreground"
              >
                Editar completo →
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form action={updateNumeroCamiseta} className="flex items-center gap-1">
                <input type="hidden" name="jugadorId" value={j.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  name="numeroCamiseta"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={j.numeroCamiseta ?? ""}
                  placeholder="Sin #"
                  className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground active:scale-95"
                >
                  Guardar
                </button>
              </form>

              <Badge tone={j.activo ? "success" : "neutral"}>{j.activo ? "Activo" : "Inactivo"}</Badge>

              <form action={toggleActivoJugador}>
                <input type="hidden" name="jugadorId" value={j.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground active:scale-95"
                >
                  {j.activo ? "Desactivar" : "Reactivar"}
                </button>
              </form>

              <form action={deleteJugadorSiSePuede}>
                <input type="hidden" name="jugadorId" value={j.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <DeleteJugadorButton nombre={j.nombre} />
              </form>
            </div>
          </div>
        ))}
        {jugadores.length === 0 && (
          <p className="animate-fade-in px-4 py-6 text-center text-sm text-muted">
            Este club no tiene jugadores todavía.
          </p>
        )}
      </div>

      <p className="max-w-xl text-xs text-muted">
        Al desactivar un jugador, deja de aparecer en nóminas futuras de Mesa, pero se conservan sus estadísticas.
        Eliminar es definitivo y solo funciona si el jugador nunca participó en un partido.
      </p>
    </div>
  );
}
