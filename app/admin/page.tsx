import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { estadoPartidoBadge } from "@/lib/estado-partido";
import {
  IconClubes,
  IconJugadores,
  IconFixture,
  IconJornadas,
  IconPartidos,
  IconUsuarios,
} from "@/components/icons";

// Todos los números vienen de consultas reales a la base — nada se inventa
// acá. Si un módulo todavía no tiene datos que mostrar, se omite en vez de
// rellenarse con un placeholder falso.
export default async function AdminHome() {
  const [
    clubesCount,
    jugadoresCount,
    jornadasCount,
    partidosPorEstado,
    usuariosMesaActivos,
    ultimosFinalizados,
    proximos,
  ] = await Promise.all([
    prisma.club.count(),
    prisma.jugador.count(),
    prisma.jornada.count(),
    prisma.partido.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.usuario.count({ where: { rol: "MESA", activo: true } }),
    prisma.partido.findMany({
      where: { estado: "FINALIZADO" },
      include: { clubLocal: true, clubVisitante: true, jornada: true, acta: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.partido.findMany({
      where: { estado: { in: ["PROGRAMADO", "CONFIRMADO"] } },
      include: { clubLocal: true, clubVisitante: true, jornada: true },
      orderBy: [{ jornada: { numero: "asc" } }, { createdAt: "asc" }],
      take: 5,
    }),
  ]);

  const conteoPorEstado = new Map(partidosPorEstado.map((p) => [p.estado, p._count._all]));
  const partidosTotal = partidosPorEstado.reduce((acc, p) => acc + p._count._all, 0);
  const enCurso = conteoPorEstado.get("EN_CURSO") ?? 0;

  const resumen = [
    { label: "Clubes", valor: clubesCount, href: "/admin/clubes", icon: <IconClubes /> },
    { label: "Jugadores", valor: jugadoresCount, href: "/admin/jugadores", icon: <IconJugadores /> },
    { label: "Jornadas", valor: jornadasCount, href: "/admin/jornadas", icon: <IconJornadas /> },
    { label: "Partidos", valor: partidosTotal, href: "/admin/partidos", icon: <IconPartidos /> },
  ];

  const accesos = [
    { label: "Fixture", href: "/admin/fixture", icon: <IconFixture />, badge: null },
    {
      label: "Usuarios de Mesa",
      href: "/admin/usuarios-mesa",
      icon: <IconUsuarios />,
      badge: `${usuariosMesaActivos} activo${usuariosMesaActivos !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Resumen de la liga</h1>
          <p className="text-sm text-muted">Estado general y accesos rápidos.</p>
        </div>
        {enCurso > 0 && (
          <Badge tone="accent-orange" live>
            {enCurso} partido{enCurso !== 1 ? "s" : ""} en curso ahora
          </Badge>
        )}
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumen.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:border-accent-blue/40 hover:bg-surface-hover"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-blue/15 text-accent-blue">
              {r.icon}
            </span>
            <span className="text-2xl font-bold tabular-nums text-foreground">{r.valor}</span>
            <span className="text-xs text-muted">{r.label}</span>
          </Link>
        ))}
      </div>

      {/* Estado de los partidos de la liga */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Estado de los partidos
        </span>
        <div className="flex flex-wrap gap-2">
          {(["PROGRAMADO", "CONFIRMADO", "EN_CURSO", "FINALIZADO"] as const).map((estado) => {
            const cantidad = conteoPorEstado.get(estado) ?? 0;
            if (cantidad === 0) return null;
            const badge = estadoPartidoBadge(estado);
            return (
              <Badge key={estado} tone={badge.tone} live={badge.live}>
                {cantidad} {badge.label.toLowerCase()}
              </Badge>
            );
          })}
          {partidosTotal === 0 && (
            <p className="text-sm text-muted">Todavía no hay partidos cargados.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Próximos partidos */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Próximos partidos
          </span>
          {proximos.length === 0 ? (
            <p className="animate-fade-in py-4 text-center text-sm text-muted">
              No hay partidos programados o confirmados todavía.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {proximos.map((p) => {
                const badge = estadoPartidoBadge(p.estado);
                return (
                  <Link
                    key={p.id}
                    href={`/admin/partidos/${p.id}`}
                    className="flex items-center justify-between gap-2 py-2 transition-colors hover:text-accent-blue"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {p.clubLocal.nombre} vs {p.clubVisitante.nombre}
                      </span>
                      <span className="text-xs text-muted">Jornada {p.jornada.numero}</span>
                    </div>
                    <Badge tone={badge.tone} live={badge.live}>
                      {badge.label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos resultados */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Últimos resultados
          </span>
          {ultimosFinalizados.length === 0 ? (
            <p className="animate-fade-in py-4 text-center text-sm text-muted">
              Todavía no hay partidos finalizados.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {ultimosFinalizados.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/partidos/${p.id}`}
                  className="flex items-center justify-between gap-2 py-2 transition-colors hover:text-accent-blue"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">
                      {p.clubLocal.nombre} vs {p.clubVisitante.nombre}
                    </span>
                    <span className="text-xs text-muted">Jornada {p.jornada.numero}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {p.acta ? `${p.acta.resultadoLocal} - ${p.acta.resultadoVisitante}` : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos a módulos sin card propio arriba */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Accesos rápidos
        </span>
        <div className="flex flex-wrap gap-2">
          {accesos.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent-blue/40 hover:text-foreground"
            >
              {a.icon}
              {a.label}
              {a.badge && <span className="text-xs text-muted">· {a.badge}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
