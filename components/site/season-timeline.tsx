import type { SeasonStage } from "@/lib/public/season-phase";

// Línea de tiempo de la temporada: Fase Regular → Playoffs → Campeón.
// Cuenta de un vistazo en qué punto del año está la liga, que es justo el
// "antes y después" que separa la fase regular de los playoffs.
//
// Server component con props puras: el estado lo calcula
// lib/public/season-phase.ts y el nombre del campeón entra por prop desde
// getPlayoffsData(), para no duplicar consultas ni crear ciclos de import.

export type SeasonTimelineProps = {
  stages: SeasonStage[];
  championName?: string | null;
};

function Trofeo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" className={className} aria-hidden="true">
      <path d="M7 2h10v7a5 5 0 0 1-10 0V2Z" fill="currentColor" />
      <path d="M7 4H4a4 4 0 0 0 4 4M17 4h3a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="10.5" y="14" width="3" height="5" fill="currentColor" />
      <rect x="6" y="19" width="12" height="2.5" rx="1" fill="currentColor" />
    </svg>
  );
}

const ESTILO_POR_ESTADO = {
  done: {
    punto: "bg-success/80 ring-success/30",
    label: "text-text-secondary",
    detalle: "text-text-secondary/70",
  },
  current: {
    punto: "bg-accent-gold ring-accent-gold/35",
    label: "text-text-primary",
    detalle: "text-accent-gold",
  },
  pending: {
    punto: "bg-white/15 ring-white/10",
    label: "text-text-secondary/60",
    detalle: "text-text-secondary/50",
  },
} as const;

export function SeasonTimeline({ stages, championName }: SeasonTimelineProps) {
  if (stages.length === 0) return null;

  return (
    <section aria-label="Estado de la temporada" className="lbsc-container lbsc-section-tight">
      <ol className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-bg-elevated px-5 py-6 sm:flex-row sm:items-start sm:gap-0 sm:px-7">
        {stages.map((stage, i) => {
          const estilo = ESTILO_POR_ESTADO[stage.state];
          const esCampeon = stage.key === "campeon";
          const detalle = esCampeon && championName ? championName : stage.detail;

          return (
            <li key={stage.key} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2">
              {/* Punto + línea conectora. En mobile la línea es vertical a la
                  izquierda; en desktop, horizontal entre etapas. */}
              <div className="flex flex-col items-center sm:w-full sm:flex-row">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ring-4 ${estilo.punto}`}
                  aria-hidden="true"
                />
                {i < stages.length - 1 && (
                  <>
                    <span className="h-8 w-px bg-white/10 sm:hidden" aria-hidden="true" />
                    <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden="true" />
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-0.5 pb-2 sm:pb-0">
                <span className="flex items-center gap-1.5">
                  {esCampeon && (
                    <Trofeo
                      className={`h-3.5 w-3.5 ${stage.state === "current" ? "text-accent-gold" : "text-text-secondary/40"}`}
                    />
                  )}
                  <span className={`font-head text-base uppercase leading-none tracking-tight ${estilo.label}`}>
                    {stage.label}
                  </span>
                </span>
                {detalle && (
                  <span className={`font-body text-[11px] uppercase tracking-wide ${estilo.detalle}`}>
                    {detalle}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
