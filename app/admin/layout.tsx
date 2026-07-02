import { requireRole } from "@/lib/auth";
import { InternalHeader } from "@/components/internal-header";
import { AdminNavLink } from "@/components/admin-nav-link";
import {
  IconDashboard,
  IconClubes,
  IconJugadores,
  IconFixture,
  IconJornadas,
  IconPartidos,
  IconActas,
  IconUsuarios,
} from "@/components/icons";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/admin", label: "Resumen", icon: <IconDashboard /> }],
  },
  {
    label: "Liga",
    items: [
      { href: "/admin/clubes", label: "Clubes", icon: <IconClubes /> },
      { href: "/admin/jugadores", label: "Jugadores", icon: <IconJugadores /> },
      { href: "/admin/fixture", label: "Fixture", icon: <IconFixture /> },
      { href: "/admin/jornadas", label: "Jornadas", icon: <IconJornadas /> },
    ],
  },
  {
    label: "Partidos",
    items: [
      { href: "/admin/partidos", label: "Partidos", icon: <IconPartidos /> },
      { href: "/admin/actas", label: "Actas", icon: <IconActas /> },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/admin/usuarios-mesa", label: "Usuarios de Mesa", icon: <IconUsuarios /> }],
  },
];

const NAV_ITEMS_FLAT = NAV_GROUPS.flatMap((g) => g.items);

// Layout base del Admin: sidebar (desktop/tablet) + nav horizontal con
// scroll (mobile, donde un sidebar fijo se comería casi toda la pantalla).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("ADMIN");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface/40 md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-blue text-xs font-bold text-white">
            SC
          </span>
          <span className="text-sm font-semibold tracking-wide">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-4 px-2 py-4">
          {NAV_GROUPS.map((group, i) => (
            <div key={i} className="flex flex-col gap-1">
              {group.label && (
                <span className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted/70">
                  {group.label}
                </span>
              )}
              {group.items.map((item) => (
                <AdminNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <InternalHeader
          label="Admin"
          accent="accent-blue"
          userEmail={usuario.email}
          showBrand={false}
        />
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
          {NAV_ITEMS_FLAT.map((item) => (
            <div key={item.href} className="shrink-0">
              <AdminNavLink href={item.href} label={item.label} icon={item.icon} />
            </div>
          ))}
        </nav>
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
