import { requireRole } from "@/lib/auth";
import { InternalHeader } from "@/components/internal-header";

// Layout de Mesa: tablet-first, sin sidebar.
export default async function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRole("MESA");

  return (
    <div className="flex flex-1 flex-col">
      <InternalHeader label="MESA" accent="accent-orange" userEmail={usuario.email} />
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
