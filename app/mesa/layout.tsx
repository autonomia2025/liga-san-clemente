import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// Layout de Mesa: tablet-first, sin sidebar. La consola de operación real
// del partido se construye en Fase 2.
export default async function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("MESA");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-orange text-sm font-bold text-white">
            SC
          </span>
          <span className="text-sm font-semibold tracking-wide">MESA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{usuario.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
