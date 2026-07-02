import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ClubesPage() {
  const clubes = await prisma.club.findMany({
    orderBy: { nombre: "asc" },
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

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clubes</h1>
        <p className="text-sm text-muted">{clubes.length} clubes registrados.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clubes.map((club) => {
          const partidos =
            club._count.partidosComoLocal + club._count.partidosComoVisitante;
          return (
            <Link
              key={club.id}
              href={`/admin/clubes/${club.id}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-blue text-sm font-bold text-white">
                  {club.nombre.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-medium text-foreground">{club.nombre}</span>
              </div>
              <div className="flex gap-4 text-sm text-muted">
                <span>{club._count.jugadores} jugadores</span>
                <span>{club._count.staff} staff</span>
                <span>{partidos} partidos</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
