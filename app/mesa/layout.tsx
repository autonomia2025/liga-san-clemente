import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// Layout mínimo — solo para probar la protección por rol.
// El diseño real de la consola de Mesa se construye en PR 0.5 (y su UX en Fase 2).
export default async function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("MESA");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Mesa — {usuario.email}
        </span>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
