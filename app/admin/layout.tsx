import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  { href: "/admin/clubes", label: "Clubes" },
  { href: "/admin/jugadores", label: "Jugadores" },
  { href: "/admin/fixture", label: "Fixture" },
  { href: "/admin/jornadas", label: "Jornadas" },
  { href: "/admin/partidos", label: "Partidos" },
  { href: "/admin/actas", label: "Actas" },
  { href: "/admin/usuarios-mesa", label: "Usuarios de Mesa" },
];

// Layout base del Admin: sidebar + contenido. Las secciones son placeholders
// (sin CRUD todavía) — se implementan en los PRs de Fase 1.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("ADMIN");

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-blue text-xs font-bold text-white">
            SC
          </span>
          <span className="text-sm font-semibold">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm text-muted">{usuario.email}</span>
          <LogoutButton />
        </header>
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
