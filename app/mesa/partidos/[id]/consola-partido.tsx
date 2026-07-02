import type { LiveMatchState } from "@/lib/mesa/live-match-state";
import { controlarCuarto, registrarPunto } from "./actions";

type JugadorSlot = { id: string; nombre: string; numeroCamiseta: number | null };

const VALORES_PUNTO = [1, 2, 3] as const;

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function JugadorCanchaCard({
  jugador,
  partidoId,
  puntos,
  puedeAnotar,
}: {
  jugador: JugadorSlot;
  partidoId: string;
  puntos: number;
  puedeAnotar: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-surface px-2 py-3">
      <span className="text-2xl font-bold text-foreground">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="line-clamp-1 text-center text-[11px] text-muted">{jugador.nombre}</span>
      <span className="text-[10px] font-semibold text-accent-blue">{puntos} pts</span>
      {puedeAnotar && (
        <div className="mt-1 flex gap-1">
          {VALORES_PUNTO.map((valor) => (
            <form key={valor} action={registrarPunto}>
              <input type="hidden" name="partidoId" value={partidoId} />
              <input type="hidden" name="jugadorId" value={jugador.id} />
              <input type="hidden" name="valor" value={valor} />
              <button
                type="submit"
                className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted hover:bg-accent-blue hover:text-white"
              >
                +{valor}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function JugadorBancaChip({ jugador }: { jugador: JugadorSlot }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-500/20 text-[11px] font-semibold text-muted">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="max-w-[9rem] truncate text-xs text-foreground">{jugador.nombre}</span>
    </div>
  );
}

const ACCIONES_PLACEHOLDER = ["Falta", "Sustitución", "Timeout", "Posesión"];

function ControlCuarto({
  partidoId,
  liveState,
}: {
  partidoId: string;
  liveState: LiveMatchState;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-full bg-accent-orange/20 px-2.5 py-1 text-[11px] font-semibold text-accent-orange">
        {liveState.mensajeCuartos}
      </span>
      {liveState.proximaAccionCuarto && (
        <form action={controlarCuarto}>
          <input type="hidden" name="partidoId" value={partidoId} />
          <input type="hidden" name="accion" value={liveState.proximaAccionCuarto.tipo} />
          <input type="hidden" name="cuarto" value={liveState.proximaAccionCuarto.cuarto} />
          <button
            type="submit"
            className="rounded-full bg-accent-orange px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90"
          >
            {liveState.proximaAccionCuarto.tipo === "iniciar"
              ? `Iniciar Q${liveState.proximaAccionCuarto.cuarto}`
              : `Finalizar Q${liveState.proximaAccionCuarto.cuarto}`}
          </button>
        </form>
      )}
    </div>
  );
}

export function ConsolaPartido({
  partidoId,
  clubLocalNombre,
  clubVisitanteNombre,
  canchaLocal,
  canchaVisitante,
  bancaLocal,
  bancaVisitante,
  liveState,
}: {
  partidoId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  canchaLocal: JugadorSlot[];
  canchaVisitante: JugadorSlot[];
  bancaLocal: JugadorSlot[];
  bancaVisitante: JugadorSlot[];
  liveState: LiveMatchState;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Scoreboard: pieza principal de la pantalla, sticky para no perderla al scrollear. */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-border bg-surface/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:text-base">
            {clubLocalNombre}
          </span>
          <span className="shrink-0 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {liveState.marcadorLocal}&nbsp;-&nbsp;{liveState.marcadorVisitante}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-foreground sm:text-base">
            {clubVisitanteNombre}
          </span>
        </div>
        <ControlCuarto partidoId={partidoId} liveState={liveState} />
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted">
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Posesión: sin asignar</span>
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Faltas Local: 0</span>
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Faltas Visita: 0</span>
        </div>
      </div>

      {/* Cancha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {clubLocalNombre} — Cancha
          </h3>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {canchaLocal.map((j) => (
              <JugadorCanchaCard
                key={j.id}
                jugador={j}
                partidoId={partidoId}
                puntos={liveState.puntosPorJugador.get(j.id) ?? 0}
                puedeAnotar={liveState.cuartoActivo !== null}
              />
            ))}
          </div>
          {canchaLocal.length === 0 && (
            <p className="text-xs text-muted">Sin jugadores en cancha todavía.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {clubVisitanteNombre} — Cancha
          </h3>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {canchaVisitante.map((j) => (
              <JugadorCanchaCard
                key={j.id}
                jugador={j}
                partidoId={partidoId}
                puntos={liveState.puntosPorJugador.get(j.id) ?? 0}
                puedeAnotar={liveState.cuartoActivo !== null}
              />
            ))}
          </div>
          {canchaVisitante.length === 0 && (
            <p className="text-xs text-muted">Sin jugadores en cancha todavía.</p>
          )}
        </div>
      </div>

      {/* Banca: chips compactos en vez de lista vertical alta. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {clubLocalNombre} — Banca
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {bancaLocal.map((j) => (
              <JugadorBancaChip key={j.id} jugador={j} />
            ))}
            {bancaLocal.length === 0 && <p className="text-xs text-muted">Sin banca.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {clubVisitanteNombre} — Banca
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {bancaVisitante.map((j) => (
              <JugadorBancaChip key={j.id} jugador={j} />
            ))}
            {bancaVisitante.length === 0 && <p className="text-xs text-muted">Sin banca.</p>}
          </div>
        </div>
      </div>

      {/* Acciones placeholder */}
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-[11px] text-muted">Registro del partido — próximamente</p>
        <div className="flex flex-wrap gap-1.5">
          {ACCIONES_PLACEHOLDER.map((accion) => (
            <button
              key={accion}
              type="button"
              disabled
              title="Próximamente"
              className="cursor-not-allowed rounded-md border border-border px-2.5 py-1.5 text-xs text-muted opacity-50"
            >
              {accion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
