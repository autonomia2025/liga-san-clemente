import type { EstadoPartido } from "@/generated/prisma/client";

export function estadoPartidoBadge(estado: EstadoPartido): {
  label: string;
  className: string;
} {
  switch (estado) {
    case "FINALIZADO":
      return { label: "Finalizado", className: "bg-green-500/15 text-green-400" };
    case "EN_CURSO":
      return { label: "En curso", className: "bg-accent-orange/20 text-accent-orange" };
    case "CONFIRMADO":
      return { label: "Confirmado", className: "bg-accent-blue/20 text-accent-blue" };
    case "PROGRAMADO":
    default:
      return { label: "Programado", className: "bg-zinc-500/20 text-muted" };
  }
}
