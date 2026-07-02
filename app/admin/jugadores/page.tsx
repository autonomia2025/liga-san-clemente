import Link from "next/link";
import { prisma } from "@/lib/db";
import { isValidRutFormat, maskRut } from "@/lib/rut";
import { Badge } from "@/components/ui/badge";

export default async function JugadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; q?: string }>;
}) {
  const { club: clubId, q } = await searchParams;

  const clubes = await prisma.club.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { jugadores: true } } },
  });

  const sinDorsalPorClub = await prisma.jugador.groupBy({
    by: ["clubId"],
    where: { numeroCamiseta: null },
    _count: { _all: true },
  });
  const sinDorsalMap = new Map(sinDorsalPorClub.map((r) => [r.clubId, r._count._all]));

  const jugadores = await prisma.jugador.findMany({
    where: {
      ...(clubId ? { clubId } : {}),
      ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { club: true },
    orderBy: [{ club: { nombre: "asc" } }, { nombre: "asc" }],
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Jugadores</h1>
        <p className="text-sm text-muted">{jugadores.length} jugadores mostrados.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {clubes.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs transition-colors hover:border-accent-blue/40"
          >
            <span className="text-foreground">{c.nombre}</span>
            <span className="text-muted">{c._count.jugadores} jug.</span>
            {(sinDorsalMap.get(c.id) ?? 0) > 0 && (
              <Badge tone="accent-orange">{sinDorsalMap.get(c.id)} sin dorsal</Badge>
            )}
          </div>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Club
          <select
            name="club"
            defaultValue={clubId ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          >
            <option value="">Todos</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Buscar por nombre
          <input
            name="q"
            type="text"
            defaultValue={q ?? ""}
            placeholder="Nombre..."
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          Filtrar
        </button>
        {(clubId || q) && (
          <Link
            href="/admin/jugadores"
            className="text-sm text-muted underline transition-colors hover:text-foreground"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {jugadores.map((j) => {
          const rutStatus = !j.rut
            ? { label: "Sin RUT", tone: "neutral" as const }
            : isValidRutFormat(j.rut)
              ? { label: `RUT ${maskRut(j.rut)}`, tone: "success" as const }
              : { label: `RUT ${maskRut(j.rut)} (formato)`, tone: "danger" as const };

          return (
            <Link
              key={j.id}
              href={`/admin/jugadores/${j.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-surface-hover"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{j.nombre}</span>
                <span className="text-xs text-muted">{j.club.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={j.numeroCamiseta !== null ? "accent-blue" : "accent-orange"}>
                  {j.numeroCamiseta !== null ? `#${j.numeroCamiseta}` : "Sin dorsal"}
                </Badge>
                <Badge tone={rutStatus.tone}>{rutStatus.label}</Badge>
              </div>
            </Link>
          );
        })}
        {jugadores.length === 0 && (
          <p className="animate-fade-in px-4 py-6 text-center text-sm text-muted">
            No hay jugadores que coincidan con el filtro.
          </p>
        )}
      </div>
    </div>
  );
}
