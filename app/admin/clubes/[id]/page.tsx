import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateClub } from "./actions";

export default async function ClubDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          jugadores: true,
          staff: true,
          partidosComoLocal: true,
          partidosComoVisitante: true,
        },
      },
    },
  });

  if (!club) notFound();

  const partidos = club._count.partidosComoLocal + club._count.partidosComoVisitante;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link href="/admin/clubes" className="text-sm text-muted hover:text-foreground">
        ← Clubes
      </Link>

      <div className="grid grid-cols-3 gap-3 sm:w-80">
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{club._count.jugadores}</div>
          <div className="text-xs text-muted">Jugadores</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{club._count.staff}</div>
          <div className="text-xs text-muted">Staff</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <div className="text-lg font-semibold text-foreground">{partidos}</div>
          <div className="text-xs text-muted">Partidos</div>
        </div>
      </div>

      <form
        action={updateClub}
        className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <h1 className="text-lg font-semibold text-foreground">Editar club</h1>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {ok && <p className="text-sm text-green-400">Club actualizado.</p>}

        <input type="hidden" name="clubId" value={club.id} />

        <label className="flex flex-col gap-1 text-sm text-muted">
          Nombre
          <input
            name="nombre"
            type="text"
            required
            defaultValue={club.nombre}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          URL del escudo (opcional)
          <input
            name="escudoUrl"
            type="text"
            defaultValue={club.escudoUrl ?? ""}
            placeholder="https://..."
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
