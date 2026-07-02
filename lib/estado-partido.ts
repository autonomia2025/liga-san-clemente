import type { EstadoPartido } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";

export function estadoPartidoBadge(estado: EstadoPartido): {
  label: string;
  tone: BadgeTone;
  live: boolean;
} {
  switch (estado) {
    case "FINALIZADO":
      return { label: "Finalizado", tone: "success", live: false };
    case "EN_CURSO":
      return { label: "En curso", tone: "accent-orange", live: true };
    case "CONFIRMADO":
      return { label: "Confirmado", tone: "accent-blue", live: false };
    case "PROGRAMADO":
    default:
      return { label: "Programado", tone: "neutral", live: false };
  }
}
