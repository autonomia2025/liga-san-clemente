"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Único motivo por el que este componente es "use client": usePathname()
// para resaltar el módulo activo — el resto del sidebar sigue siendo
// server-rendered en admin/layout.tsx.
export function AdminNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const activo = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        activo
          ? "bg-accent-blue/15 font-medium text-accent-blue"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      <span className={activo ? "text-accent-blue" : "text-muted"}>{icon}</span>
      {label}
    </Link>
  );
}
