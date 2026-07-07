// Descripción legible de un MatchEvent — antes vivía duplicada e inline en
// consola-partido.tsx (solo para "último evento"). Se saca a un módulo propio
// de dominio porque ahora también la usa el Play by Play público
// (lib/public/live-page-data.ts): mismo evento, misma descripción en Mesa y
// en el sitio público, una sola fuente de verdad.
import type { TipoFalta } from "@/generated/prisma/client";

const TIPOS_FALTA_LABEL: Record<TipoFalta, string> = {
  PERSONAL: "Personal",
  TECNICA: "Técnica",
  ANTIDEPORTIVA: "Antideportiva",
  DESCALIFICANTE: "Descalificante",
  EXPULSION_DIRECTA: "Expulsión",
};

export type EventoDescribible = {
  tipo: string;
  cuarto: number;
  jugadorId: string | null;
  clubId: string | null;
  detalle: unknown;
};

export type DescribirContext = {
  clubLocalId: string;
  clubVisitanteId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  nombresJugadores: Map<string, string>;
};

export function nombreClubDe(clubId: string | null, context: DescribirContext): string {
  return clubId === context.clubLocalId
    ? context.clubLocalNombre
    : clubId === context.clubVisitanteId
      ? context.clubVisitanteNombre
      : "equipo";
}

export function nombreJugadorDe(jugadorId: string | null, context: DescribirContext): string {
  return (jugadorId && context.nombresJugadores.get(jugadorId)) || "jugador";
}

function labelFalta(tipoFalta: unknown): string {
  if (typeof tipoFalta === "string" && tipoFalta in TIPOS_FALTA_LABEL) {
    return TIPOS_FALTA_LABEL[tipoFalta as TipoFalta];
  }
  return "Falta";
}

export function extraerValorPunto(detalle: unknown): number | null {
  if (detalle && typeof detalle === "object" && !Array.isArray(detalle) && "valor" in detalle) {
    const v = (detalle as { valor: unknown }).valor;
    return typeof v === "number" ? v : null;
  }
  return null;
}

// Reloj del cuarto en el momento del evento — solo existe para eventos
// registrados después de esta PR; los anteriores no tienen esta info y no se
// inventa (queda null, la UI lo maneja mostrando el evento sin hora).
export function extraerClock(detalle: unknown): { minuto: number; segundo: number; clockLabel: string } | null {
  if (
    detalle &&
    typeof detalle === "object" &&
    !Array.isArray(detalle) &&
    "clockLabel" in detalle &&
    typeof (detalle as { clockLabel: unknown }).clockLabel === "string"
  ) {
    const d = detalle as { minuto?: unknown; segundo?: unknown; clockLabel: string };
    const minuto = typeof d.minuto === "number" ? d.minuto : 0;
    const segundo = typeof d.segundo === "number" ? d.segundo : 0;
    return { minuto, segundo, clockLabel: d.clockLabel };
  }
  return null;
}

// Parsea "MM:SS" (lo que manda el cronómetro cliente de Mesa) a sus partes.
// Nunca lanza — si el formato es inválido devuelve null y el evento se guarda
// sin tiempo, en vez de fallar el registro de la jugada por un dato opcional.
export function parseClockLabel(raw: string): { minuto: number; segundo: number; clockLabel: string } | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(raw.trim());
  if (!m) return null;
  const minuto = Number(m[1]);
  const segundo = Number(m[2]);
  if (minuto < 0 || minuto > 99) return null;
  const clockLabel = `${String(minuto).padStart(2, "0")}:${String(segundo).padStart(2, "0")}`;
  return { minuto, segundo, clockLabel };
}

export function describirEvento(evento: EventoDescribible, context: DescribirContext): string {
  switch (evento.tipo) {
    case "PUNTO": {
      const valor = extraerValorPunto(evento.detalle);
      return `+${valor ?? ""} ${nombreJugadorDe(evento.jugadorId, context)}`.trim();
    }
    case "FALTA": {
      const tipoFalta =
        evento.detalle && typeof evento.detalle === "object" && !Array.isArray(evento.detalle) && "tipoFalta" in evento.detalle
          ? (evento.detalle as { tipoFalta: unknown }).tipoFalta
          : null;
      return `Falta ${labelFalta(tipoFalta)} — ${nombreJugadorDe(evento.jugadorId, context)}`;
    }
    case "TIMEOUT":
      return `Timeout ${nombreClubDe(evento.clubId, context)}`;
    case "POSESION":
      return `Posesión ${nombreClubDe(evento.clubId, context)}`;
    case "SUSTITUCION":
      return "Sustitución";
    case "INICIO_CUARTO":
      return `Inicio Q${evento.cuarto}`;
    case "FIN_CUARTO":
      return `Fin Q${evento.cuarto}`;
    default:
      return "Evento";
  }
}
