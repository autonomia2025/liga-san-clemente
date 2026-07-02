import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isValidRutFormat, maskRut } from "@/lib/rut";
import { updateJugador } from "./actions";

export default async function JugadorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [jugador, clubes] = await Promise.all([
    prisma.jugador.findUnique({ where: { id }, include: { club: true } }),
    prisma.club.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  if (!jugador) notFound();

  const rutStatus = !jugador.rut
    ? "Sin RUT registrado."
    : isValidRutFormat(jugador.rut)
      ? `RUT ${maskRut(jugador.rut)} (formato válido).`
      : `RUT ${maskRut(jugador.rut)} (formato fuera de lo esperado, revisar en el registro oficial).`;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link href="/admin/jugadores" className="w-fit text-sm text-muted transition-colors hover:text-foreground">
        ← Jugadores
      </Link>

      <h1 className="text-xl font-semibold text-foreground">{jugador.nombre}</h1>

      <div className="max-w-md rounded-lg border border-dashed border-border p-4 text-sm text-muted">
        {rutStatus}
        <br />
        RUT no editable desde acá — se corrige en el Excel origen y se vuelve a importar.
      </div>

      <form
        action={updateJugador}
        className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <h2 className="text-lg font-semibold text-foreground">Editar jugador</h2>

        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">Jugador actualizado.</p>}

        <input type="hidden" name="jugadorId" value={jugador.id} />

        <label className="flex flex-col gap-1 text-sm text-muted">
          Nombre
          <input
            name="nombre"
            type="text"
            required
            defaultValue={jugador.nombre}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Número de camiseta
          <input
            name="numeroCamiseta"
            type="number"
            min={0}
            defaultValue={jugador.numeroCamiseta ?? ""}
            placeholder="Sin asignar"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
          <span className="text-xs text-muted">Dejar vacío para quitar el dorsal.</span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          URL de foto (opcional)
          <input
            name="fotoUrl"
            type="text"
            defaultValue={jugador.fotoUrl ?? ""}
            placeholder="https://..."
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Club
          <select
            name="clubId"
            defaultValue={jugador.clubId}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          >
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            Cambiar el club no modifica el historial de partidos ya jugados.
          </span>
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
