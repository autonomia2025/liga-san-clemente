"use client";

import { useEffect, useRef, useState } from "react";
import type { TipoFalta } from "@/generated/prisma/client";
import type { LiveMatchState } from "@/lib/mesa/live-match-state";
import { describirEvento } from "@/lib/mesa/describir-evento";
import { Badge } from "@/components/ui/badge";
import {
  controlarCuarto,
  registrarPunto,
  registrarFalta,
  registrarSustitucion,
  registrarTimeout,
  registrarPosesion,
  deshacerUltimoEvento,
  finalizarPartido,
} from "./actions";

type JugadorSlot = { id: string; nombre: string; numeroCamiseta: number | null };

const VALORES_PUNTO = [1, 2, 3] as const;

const TIPOS_FALTA: { valor: TipoFalta; label: string }[] = [
  { valor: "PERSONAL", label: "Personal" },
  { valor: "TECNICA", label: "Técnica" },
  { valor: "ANTIDEPORTIVA", label: "Antideportiva" },
  { valor: "DESCALIFICANTE", label: "Descalificante" },
  { valor: "EXPULSION_DIRECTA", label: "Expulsión" },
];

// Badge visible solo para faltas graves — la personal es la esperable y no
// necesita destacarse en la card, alcanza con el contador.
const TIPOS_FALTA_BADGE = new Set<TipoFalta>([
  "TECNICA",
  "ANTIDEPORTIVA",
  "DESCALIFICANTE",
  "EXPULSION_DIRECTA",
]);

function badgeFalta(tipos: TipoFalta[]): string | null {
  const grave = tipos.find((t) => TIPOS_FALTA_BADGE.has(t));
  return grave ? TIPOS_FALTA.find((t) => t.valor === grave)?.label ?? null : null;
}

function describirUltimoEvento(
  evento: LiveMatchState["ultimoEventoVigente"],
  context: {
    clubLocalId: string;
    clubVisitanteId: string;
    clubLocalNombre: string;
    clubVisitanteNombre: string;
    nombresJugadores: Map<string, string>;
  },
): string | null {
  if (!evento) return null;
  return describirEvento(evento, context);
}

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
  faltas,
  tiposFalta,
  puedeAnotar,
  banca,
  clockLabel,
}: {
  jugador: JugadorSlot;
  partidoId: string;
  puntos: number;
  faltas: number;
  tiposFalta: TipoFalta[];
  puedeAnotar: boolean;
  banca: JugadorSlot[];
  clockLabel: string;
}) {
  const badge = badgeFalta(tiposFalta);

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-3 transition-colors hover:border-accent-blue/30">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-hover text-lg font-bold text-foreground ring-1 ring-border">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="line-clamp-1 text-center text-[11px] font-medium text-muted">
        {jugador.nombre}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="rounded-full bg-accent-blue/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-blue">
          {puntos} pts
        </span>
        <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
          {faltas} f
        </span>
        {badge && (
          <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-semibold text-danger">
            {badge}
          </span>
        )}
      </div>
      {puedeAnotar && (
        <div className="mt-1 flex w-full flex-col items-center gap-1">
          <div className="flex gap-1">
            {VALORES_PUNTO.map((valor) => (
              <form key={valor} action={registrarPunto}>
                <input type="hidden" name="partidoId" value={partidoId} />
                <input type="hidden" name="jugadorId" value={jugador.id} />
                <input type="hidden" name="valor" value={valor} />
                <input type="hidden" name="tiempoRestante" value={clockLabel} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95"
                >
                  +{valor}
                </button>
              </form>
            ))}
          </div>
          <details className="w-full">
            <summary className="cursor-pointer select-none rounded-md py-0.5 text-center text-[10px] font-semibold text-muted hover:text-accent-orange">
              Falta
            </summary>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {TIPOS_FALTA.map((t) => (
                <form key={t.valor} action={registrarFalta}>
                  <input type="hidden" name="partidoId" value={partidoId} />
                  <input type="hidden" name="jugadorId" value={jugador.id} />
                  <input type="hidden" name="tipoFalta" value={t.valor} />
                  <input type="hidden" name="tiempoRestante" value={clockLabel} />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted hover:bg-accent-orange hover:text-white active:scale-95"
                  >
                    {t.label}
                  </button>
                </form>
              ))}
            </div>
          </details>
          {banca.length > 0 && (
            <details className="w-full">
              <summary className="cursor-pointer select-none rounded-md py-0.5 text-center text-[10px] font-semibold text-muted hover:text-accent-blue">
                Sustituir
              </summary>
              <form action={registrarSustitucion} className="mt-1 flex flex-col items-center gap-1">
                <input type="hidden" name="partidoId" value={partidoId} />
                <input type="hidden" name="jugadorSaleId" value={jugador.id} />
                <input type="hidden" name="tiempoRestante" value={clockLabel} />
                <select
                  name="jugadorEntraId"
                  aria-label={`Jugador que entra por ${jugador.nombre}`}
                  className="w-full rounded-md border border-border bg-surface px-1 py-0.5 text-[9px] text-foreground"
                >
                  {banca.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.numeroCamiseta !== null ? `#${b.numeroCamiseta} ` : ""}
                      {b.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-border px-1.5 py-0.5 text-[9px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95"
                >
                  Confirmar entrada
                </button>
              </form>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function JugadorBancaChip({ jugador }: { jugador: JugadorSlot }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 transition-colors hover:border-accent-blue/30 hover:bg-surface-hover">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-hover text-[11px] font-semibold text-muted ring-1 ring-border">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="max-w-[9rem] truncate text-xs text-foreground">{jugador.nombre}</span>
    </div>
  );
}

function BotonTimeout({
  partidoId,
  clubId,
  label,
  contador,
  disabled,
  clockLabel,
}: {
  partidoId: string;
  clubId: string;
  label: string;
  contador: number;
  disabled: boolean;
  clockLabel: string;
}) {
  return (
    <form action={registrarTimeout}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="tiempoRestante" value={clockLabel} />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label} · TO {contador}
      </button>
    </form>
  );
}

function BotonPosesion({
  partidoId,
  clubId,
  label,
  activa,
  disabled,
  clockLabel,
}: {
  partidoId: string;
  clubId: string;
  label: string;
  activa: boolean;
  disabled: boolean;
  clockLabel: string;
}) {
  return (
    <form action={registrarPosesion}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="tiempoRestante" value={clockLabel} />
      <button
        type="submit"
        disabled={disabled}
        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 ${
          activa
            ? "border-accent-orange bg-accent-orange text-white"
            : "border-border text-muted hover:bg-accent-orange hover:text-white"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function BotonDeshacer({
  partidoId,
  descripcion,
}: {
  partidoId: string;
  descripcion: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted">
      <span className="truncate">
        Último: <span className="text-foreground">{descripcion ?? "sin eventos todavía"}</span>
      </span>
      <form action={deshacerUltimoEvento}>
        <input type="hidden" name="partidoId" value={partidoId} />
        <button
          type="submit"
          disabled={!descripcion}
          className="shrink-0 rounded-full border border-border px-3 py-1 font-semibold text-muted hover:border-danger/60 hover:bg-danger/10 hover:text-danger active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Deshacer
        </button>
      </form>
    </div>
  );
}

// Cronómetro por cuarto — 100% cliente, no persiste en DB todavía (no hay
// campos para eso en el schema y no se migra sin aprobación). Cada evento
// igual guarda el tiempo que marcaba al momento de registrarse (va en
// detalle.clockLabel del MatchEvent, ver actions.ts) — eso sí es dato
// permanente. Si se recarga la página el cronómetro vuelve a foja cero y
// puede necesitar el ajuste manual (input de abajo) — limitación conocida y
// aceptada mientras no se persista el reloj del partido.
function useCronometro(duracionMinutos: number, cuartoActivo: number | null) {
  const totalInicial = duracionMinutos * 60;
  const [segundos, setSegundos] = useState(totalInicial);
  const [corriendo, setCorriendo] = useState(false);
  const cuartoAnterior = useRef<number | null>(null);
  const primeraCarga = useRef(true);

  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      cuartoAnterior.current = cuartoActivo;
      return;
    }
    if (cuartoActivo !== cuartoAnterior.current) {
      setSegundos(totalInicial);
      setCorriendo(false);
      cuartoAnterior.current = cuartoActivo;
    }
  }, [cuartoActivo, totalInicial]);

  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => {
      setSegundos((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [corriendo]);

  useEffect(() => {
    if (segundos === 0) setCorriendo(false);
  }, [segundos]);

  const label = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  return { segundos, setSegundos, corriendo, setCorriendo, label, totalInicial };
}

function Cronometro({
  duracionMinutos,
  cuartoActivo,
  clock,
}: {
  duracionMinutos: number;
  cuartoActivo: number | null;
  clock: ReturnType<typeof useCronometro>;
}) {
  const { segundos, setSegundos, corriendo, setCorriendo, label, totalInicial } = clock;
  const [editando, setEditando] = useState(false);
  const [valorEdit, setValorEdit] = useState(label);

  if (cuartoActivo === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-1.5">
        <span className="font-mono text-xl font-bold tabular-nums text-muted">--:--</span>
        <span className="text-[10px] uppercase tracking-wide text-muted">Sin cuarto activo</span>
      </div>
    );
  }

  function aplicarEdicion() {
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(valorEdit.trim());
    if (!m) return;
    setSegundos(Number(m[1]) * 60 + Number(m[2]));
    setEditando(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
      {editando ? (
        <div className="flex items-center gap-1">
          <input
            value={valorEdit}
            onChange={(e) => setValorEdit(e.target.value)}
            placeholder="MM:SS"
            className="w-16 rounded-md border border-border bg-background px-1.5 py-1 text-center font-mono text-sm text-foreground"
          />
          <button
            type="button"
            onClick={aplicarEdicion}
            className="rounded-md border border-border px-2 py-1 text-[10px] text-muted hover:bg-surface-hover active:scale-95"
          >
            Ajustar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="text-[10px] text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValorEdit(label);
            setEditando(true);
          }}
          title="Tocar para ajustar el reloj manualmente"
          className="font-mono text-2xl font-bold tabular-nums text-foreground hover:text-accent-orange"
        >
          {label}
        </button>
      )}

      {!corriendo ? (
        <button
          type="button"
          onClick={() => segundos > 0 && setCorriendo(true)}
          disabled={segundos === 0}
          className="rounded-full bg-accent-orange px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {segundos === totalInicial ? "Iniciar" : "Reanudar"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setCorriendo(false)}
          className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted hover:bg-surface-hover active:scale-95"
        >
          Pausar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`¿Reiniciar el cronómetro a ${duracionMinutos}:00?`)) {
            setSegundos(totalInicial);
            setCorriendo(false);
          }
        }}
        className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted hover:border-danger/60 hover:bg-danger/10 hover:text-danger active:scale-95"
      >
        Reset
      </button>
    </div>
  );
}

function ControlCuarto({
  partidoId,
  liveState,
}: {
  partidoId: string;
  liveState: LiveMatchState;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge tone="accent-orange" live={liveState.cuartoActivo !== null}>
        {liveState.mensajeCuartos}
      </Badge>
      {liveState.proximaAccionCuarto && (
        <form action={controlarCuarto}>
          <input type="hidden" name="partidoId" value={partidoId} />
          <input type="hidden" name="accion" value={liveState.proximaAccionCuarto.tipo} />
          <input type="hidden" name="cuarto" value={liveState.proximaAccionCuarto.cuarto} />
          <button
            type="submit"
            className="rounded-full bg-accent-orange px-4 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95"
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

function FinalizarPartido({
  partidoId,
  liveState,
}: {
  partidoId: string;
  liveState: LiveMatchState;
}) {
  if (liveState.estadoCuartos !== "CUARTOS_COMPLETADOS") {
    return (
      <p className="text-center text-[11px] text-muted">
        Para finalizar el partido, primero debe terminar Q4.
      </p>
    );
  }

  return (
    <form action={finalizarPartido} className="flex justify-center">
      <input type="hidden" name="partidoId" value={partidoId} />
      <button
        type="submit"
        className="rounded-full bg-danger px-4 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95"
      >
        Finalizar partido ({liveState.marcadorLocal}&nbsp;-&nbsp;{liveState.marcadorVisitante})
      </button>
    </form>
  );
}

function abrevClub(nombre: string): string {
  return nombre.slice(0, 3).toUpperCase();
}

function PosesionDot({ activa }: { activa: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full transition-all duration-300 ${
        activa ? "scale-125 bg-accent-orange" : "bg-transparent"
      }`}
    />
  );
}

function EquipoScoreboard({
  nombre,
  align,
  posesionActiva,
  faltasCuarto,
  faltasTotal,
  timeouts,
}: {
  nombre: string;
  align: "left" | "right";
  posesionActiva: boolean;
  faltasCuarto: number;
  faltasTotal: number;
  timeouts: number;
}) {
  const filaNombre =
    align === "left" ? (
      <>
        <PosesionDot activa={posesionActiva} />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-bold text-foreground ring-1 ring-border">
          {abrevClub(nombre)}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-foreground sm:text-base">
          {nombre}
        </span>
      </>
    ) : (
      <>
        <span className="min-w-0 truncate text-right text-sm font-medium text-foreground sm:text-base">
          {nombre}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-bold text-foreground ring-1 ring-border">
          {abrevClub(nombre)}
        </span>
        <PosesionDot activa={posesionActiva} />
      </>
    );

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${align === "right" ? "items-end" : "items-start"}`}>
      <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {filaNombre}
      </div>
      <div className={`flex items-center gap-1.5 text-[10px] text-muted ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-semibold text-warning">
          {faltasCuarto} f (Q) · {faltasTotal} total
        </span>
        <span className="rounded-full bg-zinc-500/20 px-1.5 py-0.5 font-semibold">TO {timeouts}</span>
      </div>
    </div>
  );
}

export function ConsolaPartido({
  partidoId,
  clubLocalId,
  clubVisitanteId,
  clubLocalNombre,
  clubVisitanteNombre,
  canchaLocal,
  canchaVisitante,
  bancaLocal,
  bancaVisitante,
  liveState,
  nombresJugadores,
  duracionCuartoMinutos,
}: {
  partidoId: string;
  clubLocalId: string;
  clubVisitanteId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  canchaLocal: JugadorSlot[];
  canchaVisitante: JugadorSlot[];
  bancaLocal: JugadorSlot[];
  bancaVisitante: JugadorSlot[];
  liveState: LiveMatchState;
  nombresJugadores: Map<string, string>;
  duracionCuartoMinutos: number;
}) {
  const descripcionUltimoEvento = describirUltimoEvento(liveState.ultimoEventoVigente, {
    clubLocalId,
    clubVisitanteId,
    clubLocalNombre,
    clubVisitanteNombre,
    nombresJugadores,
  });

  const clock = useCronometro(duracionCuartoMinutos, liveState.cuartoActivo);

  return (
    <div className="flex flex-col gap-3">
      {/* Scoreboard: protagonista de la pantalla, sticky para no perderla al scrollear. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ControlCuarto partidoId={partidoId} liveState={liveState} />
          <Cronometro duracionMinutos={duracionCuartoMinutos} cuartoActivo={liveState.cuartoActivo} clock={clock} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <EquipoScoreboard
            nombre={clubLocalNombre}
            align="left"
            posesionActiva={liveState.posesionEquipo === "LOCAL"}
            faltasCuarto={liveState.faltasEquipoLocalCuartoActual}
            faltasTotal={liveState.faltasEquipoLocal}
            timeouts={liveState.timeoutsLocal}
          />
          <span className="shrink-0 text-4xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-5xl">
            {liveState.marcadorLocal}&nbsp;-&nbsp;{liveState.marcadorVisitante}
          </span>
          <EquipoScoreboard
            nombre={clubVisitanteNombre}
            align="right"
            posesionActiva={liveState.posesionEquipo === "VISITANTE"}
            faltasCuarto={liveState.faltasEquipoVisitanteCuartoActual}
            faltasTotal={liveState.faltasEquipoVisitante}
            timeouts={liveState.timeoutsVisitante}
          />
        </div>
      </div>

      {/* Control central: agrupa cuarto/finalizar/timeouts/posesión/deshacer
          en una sola zona, separada del scoreboard de solo lectura. */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
        <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
          Control de partido
        </span>

        <FinalizarPartido partidoId={partidoId} liveState={liveState} />

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <BotonTimeout
            partidoId={partidoId}
            clubId={clubLocalId}
            label="Timeout Local"
            contador={liveState.timeoutsLocal}
            disabled={liveState.cuartoActivo === null}
            clockLabel={clock.label}
          />
          <BotonTimeout
            partidoId={partidoId}
            clubId={clubVisitanteId}
            label="Timeout Visita"
            contador={liveState.timeoutsVisitante}
            disabled={liveState.cuartoActivo === null}
            clockLabel={clock.label}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <BotonPosesion
            partidoId={partidoId}
            clubId={clubLocalId}
            label="Posesión Local"
            activa={liveState.posesionEquipo === "LOCAL"}
            disabled={liveState.cuartoActivo === null}
            clockLabel={clock.label}
          />
          <BotonPosesion
            partidoId={partidoId}
            clubId={clubVisitanteId}
            label="Posesión Visita"
            activa={liveState.posesionEquipo === "VISITANTE"}
            disabled={liveState.cuartoActivo === null}
            clockLabel={clock.label}
          />
        </div>

        <BotonDeshacer partidoId={partidoId} descripcion={descripcionUltimoEvento} />
      </div>

      {/* Cancha: 1 columna en portrait (celular/tablet), lado a lado desde
          lg — evita que las cards de jugador queden diminutas en pantallas
          angostas con las dos canchas apretadas una junto a la otra. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
                faltas={liveState.faltasPorJugador.get(j.id) ?? 0}
                tiposFalta={liveState.tiposFaltaPorJugador.get(j.id) ?? []}
                puedeAnotar={liveState.cuartoActivo !== null}
                banca={bancaLocal}
                clockLabel={clock.label}
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
                faltas={liveState.faltasPorJugador.get(j.id) ?? 0}
                tiposFalta={liveState.tiposFaltaPorJugador.get(j.id) ?? []}
                puedeAnotar={liveState.cuartoActivo !== null}
                banca={bancaVisitante}
                clockLabel={clock.label}
              />
            ))}
          </div>
          {canchaVisitante.length === 0 && (
            <p className="text-xs text-muted">Sin jugadores en cancha todavía.</p>
          )}
        </div>
      </div>

      {/* Banca: chips compactos en vez de lista vertical alta. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
    </div>
  );
}
