import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// Layout mínimo — solo para probar la protección por rol.
// El diseño real del panel de Admin se construye en PR 0.5.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("ADMIN");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Admin — {usuario.email}
        </span>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
