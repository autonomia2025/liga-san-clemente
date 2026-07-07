"use client";

import { useEffect, useState } from "react";
import type { LiveMatchState, TipoFaltaValor } from "@/lib/mesa/live-match-state";
import type { EstadoRelojCalculado } from "@/lib/mesa/reloj";
import { describirEvento, extraerClock, type DescribirContext } from "@/lib/mesa/describir-evento";
import { Badge } from "@/components/ui/badge";
import {
  controlarCuarto,
  registrarPunto,
  registrarFalta,
  registrarSustitucion,
  registrarTimeout,
  registrarPosesion,
  deshacerUltimoEvento,
  editarPunto,
  editarFalta,
  anularEvento,
  finalizarPartido,
  iniciarOReanudarReloj,
  pausarReloj,
  resetearReloj,
  ajustarReloj,
} from "./actions";

type JugadorSlot = { id: string; nombre: string; numeroCamiseta: number | null };

// Fila mínima que necesita el editor de "jugadas recientes" (Mesa 3.2) — un
// subconjunto de MatchEvent con id incluido (a diferencia de MatchEventLite
// de live-match-state.ts, que no lo necesita porque solo agrega/calcula, no
// apunta a filas individuales para editar/anular).
type EventoRecienteRow = {
  id: string;
  tipo: string;
  cuarto: number;
  jugadorId: string | null;
  clubId: string | null;
  detalle: unknown;
};

const VALORES_PUNTO = [1, 2, 3] as const;

// "Ofensiva" no es parte del enum Postgres TipoFalta (no está atado a
// ninguna columna real) — vive como string suelto en MatchEvent.detalle. Se
// prioriza arriba de Técnica/Antideportiva/etc porque es el tipo que pidió
// el big boss (PR Mesa 3.1), justo después de Personal para acceso rápido.
const TIPOS_FALTA: { valor: TipoFaltaValor; label: string }[] = [
  { valor: "PERSONAL", label: "Personal" },
  { valor: "OFENSIVA", label: "Ofensiva" },
  { valor: "TECNICA", label: "Técnica" },
  { valor: "ANTIDEPORTIVA", label: "Antideportiva" },
  { valor: "DESCALIFICANTE", label: "Descalificante" },
  { valor: "EXPULSION_DIRECTA", label: "Expulsión" },
];

// Badge visible solo para faltas que conviene destacar en la card — la
// personal es la esperable y no necesita destacarse, alcanza con el
// contador. Ofensiva se destaca igual que las graves: es la que la Mesa
// necesita distinguir rápido de un vistazo.
const TIPOS_FALTA_BADGE = new Set<TipoFaltaValor>([
  "OFENSIVA",
  "TECNICA",
  "ANTIDEPORTIVA",
  "DESCALIFICANTE",
  "EXPULSION_DIRECTA",
]);

function badgeFalta(tipos: TipoFaltaValor[]): string | null {
  const grave = tipos.find((t) => TIPOS_FALTA_BADGE.has(t));
  return grave ? TIPOS_FALTA.find((t) => t.valor === grave)?.label ?? null : null;
}

// FIBA: al 5º foul personal el jugador queda expulsado del partido — no tiene
// sentido dibujar más de 5 marcas.
const FALTAS_MAX_MARCAS = 5;

function MarcasFalta({ faltas }: { faltas: number }) {
  if (faltas === 0) return null;
  const marcas = Math.min(faltas, FALTAS_MAX_MARCAS);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${faltas} faltas`} title={`${faltas} faltas`}>
      {Array.from({ length: marcas }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-1 rounded-sm ${faltas >= FALTAS_MAX_MARCAS ? "bg-danger" : "bg-warning"}`}
        />
      ))}
    </div>
  );
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
}: {
  jugador: JugadorSlot;
  partidoId: string;
  puntos: number;
  faltas: number;
  tiposFalta: TipoFaltaValor[];
  puedeAnotar: boolean;
  banca: JugadorSlot[];
}) {
  const badge = badgeFalta(tiposFalta);

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-3 transition-colors hover:border-accent-blue/30">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-hover text-lg font-bold text-foreground ring-1 ring-border">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="line-clamp-1 text-center text-[11px] font-medium text-muted">
        {jugador.numeroCamiseta !== null && (
          <span className="font-bold text-foreground">#{jugador.numeroCamiseta} </span>
        )}
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
      <MarcasFalta faltas={faltas} />
      {puedeAnotar && (
        <div className="mt-1 flex w-full flex-col items-center gap-1">
          <div className="flex gap-1">
            {VALORES_PUNTO.map((valor) => (
              <form key={valor} action={registrarPunto}>
                <input type="hidden" name="partidoId" value={partidoId} />
                <input type="hidden" name="jugadorId" value={jugador.id} />
                <input type="hidden" name="valor" value={valor} />
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
        </div>
      )}
      {/* Sustituir vive fuera del gate `puedeAnotar`: la Mesa reportó que no
          poder hacer cambios con el cuarto detenido/entre cuartos era un bug
          bloqueante en el uso real — anotar sigue exigiendo cuarto activo,
          pero cambiar lineup no. */}
      {banca.length > 0 && (
        <div className="mt-1 flex w-full flex-col items-center gap-1">
          <details className="w-full">
            <summary className="cursor-pointer select-none rounded-md py-0.5 text-center text-[10px] font-semibold text-muted hover:text-accent-blue">
              Sustituir
            </summary>
            <form action={registrarSustitucion} className="mt-1 flex flex-col items-center gap-1">
              <input type="hidden" name="partidoId" value={partidoId} />
              <input type="hidden" name="jugadorSaleId" value={jugador.id} />
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
      <span className="max-w-[9rem] truncate text-xs text-foreground">
        {jugador.numeroCamiseta !== null && (
          <span className="font-bold">#{jugador.numeroCamiseta} </span>
        )}
        {jugador.nombre}
      </span>
    </div>
  );
}

// Reglamento: 5 timeouts por equipo en tiempo regular — mismo valor que
// TIMEOUTS_TIEMPO_REGULAR en actions.ts (server-side, fuente de verdad del
// bloqueo real). Este archivo es "use client" y no puede importar una const
// desde un módulo "use server", así que se duplica solo para la UI (mostrar
// "X/5" y deshabilitar el botón antes de que el usuario intente el 6º).
const TIMEOUTS_TIEMPO_REGULAR = 5;

function BotonTimeout({
  partidoId,
  clubId,
  label,
  contador,
}: {
  partidoId: string;
  clubId: string;
  label: string;
  contador: number;
}) {
  const agotado = contador >= TIMEOUTS_TIEMPO_REGULAR;
  return (
    <form action={registrarTimeout}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="clubId" value={clubId} />
      <button
        type="submit"
        disabled={agotado}
        title={agotado ? `Ya usó sus ${TIMEOUTS_TIEMPO_REGULAR} timeouts del tiempo regular` : undefined}
        className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label} · TO {contador}/{TIMEOUTS_TIEMPO_REGULAR}
      </button>
    </form>
  );
}

// Las sustituciones/posesión/timeout se permiten con el cuarto detenido o
// entre cuartos (ver actions.ts) — el único bloqueo real de Posesión es que
// el partido esté EN_CURSO, y eso ya lo garantiza requireOperadorEnCurso
// server-side (esta consola no se renderiza para partidos no EN_CURSO).
function BotonPosesion({
  partidoId,
  clubId,
  label,
  activa,
}: {
  partidoId: string;
  clubId: string;
  label: string;
  activa: boolean;
}) {
  return (
    <form action={registrarPosesion}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="clubId" value={clubId} />
      <button
        type="submit"
        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold active:scale-95 ${
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

// Editor de "jugadas recientes" (Mesa 3.2) — corrige PUNTO/FALTA en
// cualquier posición reciente del historial (no solo el último evento, a
// diferencia de BotonDeshacer). Solo estos 4 tipos son seguros de tocar en
// cualquier posición: PUNTO/FALTA/TIMEOUT/POSESION no tienen estado derivado
// (a diferencia de SUSTITUCION/INICIO_CUARTO, que sí lo tienen — esos se
// quedan exclusivos de "Deshacer último evento"). Ver actions.ts.
const TIPOS_EDITABLES = new Set(["PUNTO", "FALTA"]);
const TIPOS_ANULABLES = new Set(["PUNTO", "FALTA", "TIMEOUT", "POSESION"]);

type ConvocadoConClub = JugadorSlot & { clubAbrev: string };

function FilaEventoReciente({
  partidoId,
  evento,
  descripcion,
  clockLabel,
  clubAbrev,
  convocados,
}: {
  partidoId: string;
  evento: EventoRecienteRow;
  descripcion: string;
  clockLabel: string | null;
  clubAbrev: string | null;
  convocados: ConvocadoConClub[];
}) {
  const [editando, setEditando] = useState(false);
  const editable = TIPOS_EDITABLES.has(evento.tipo);
  const anulable = TIPOS_ANULABLES.has(evento.tipo);

  const detalle =
    evento.detalle && typeof evento.detalle === "object" && !Array.isArray(evento.detalle)
      ? (evento.detalle as Record<string, unknown>)
      : {};
  const valorActual = typeof detalle.valor === "number" ? detalle.valor : 2;
  const tipoFaltaActual = typeof detalle.tipoFalta === "string" ? detalle.tipoFalta : "PERSONAL";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted">
          Q{evento.cuarto}
          {clockLabel ? ` · ${clockLabel}` : ""}
          {clubAbrev ? ` · ${clubAbrev}` : ""}
        </span>
        <span className="font-medium text-foreground">{descripcion}</span>
        {(editable || anulable) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {editable && (
              <button
                type="button"
                onClick={() => setEditando((v) => !v)}
                className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95"
              >
                {editando ? "Cancelar" : "Editar"}
              </button>
            )}
            {anulable && !editando && (
              <form
                action={anularEvento}
                onSubmit={(e) => {
                  if (!window.confirm("¿Anular esta jugada? Queda registrada como anulada, no se borra.")) {
                    e.preventDefault();
                  }
                }}
                className="flex items-center gap-1"
              >
                <input type="hidden" name="partidoId" value={partidoId} />
                <input type="hidden" name="eventoId" value={evento.id} />
                <input
                  name="motivo"
                  placeholder="Motivo (opcional)"
                  className="w-24 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:border-danger/60 hover:bg-danger/10 hover:text-danger active:scale-95"
                >
                  Anular
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {editando && evento.tipo === "PUNTO" && (
        <form
          action={editarPunto}
          onSubmit={() => setEditando(false)}
          className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-1.5"
        >
          <input type="hidden" name="partidoId" value={partidoId} />
          <input type="hidden" name="eventoId" value={evento.id} />
          <select
            name="jugadorId"
            defaultValue={evento.jugadorId ?? ""}
            aria-label="Jugador"
            className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
          >
            {convocados.map((j) => (
              <option key={j.id} value={j.id}>
                {j.clubAbrev} {j.numeroCamiseta !== null ? `#${j.numeroCamiseta} ` : ""}
                {j.nombre}
              </option>
            ))}
          </select>
          <select
            name="valor"
            defaultValue={valorActual}
            aria-label="Valor"
            className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
          >
            {VALORES_PUNTO.map((v) => (
              <option key={v} value={v}>
                +{v}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95"
          >
            Guardar corrección
          </button>
        </form>
      )}

      {editando && evento.tipo === "FALTA" && (
        <form
          action={editarFalta}
          onSubmit={() => setEditando(false)}
          className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-1.5"
        >
          <input type="hidden" name="partidoId" value={partidoId} />
          <input type="hidden" name="eventoId" value={evento.id} />
          <select
            name="jugadorId"
            defaultValue={evento.jugadorId ?? ""}
            aria-label="Jugador"
            className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
          >
            {convocados.map((j) => (
              <option key={j.id} value={j.id}>
                {j.clubAbrev} {j.numeroCamiseta !== null ? `#${j.numeroCamiseta} ` : ""}
                {j.nombre}
              </option>
            ))}
          </select>
          <select
            name="tipoFalta"
            defaultValue={tipoFaltaActual}
            aria-label="Tipo de falta"
            className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
          >
            {TIPOS_FALTA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-accent-blue hover:text-white active:scale-95"
          >
            Guardar corrección
          </button>
        </form>
      )}
    </div>
  );
}

function CorregirJugadasRecientes({
  partidoId,
  eventos,
  describirContext,
  convocados,
}: {
  partidoId: string;
  eventos: EventoRecienteRow[];
  describirContext: DescribirContext;
  convocados: ConvocadoConClub[];
}) {
  if (eventos.length === 0) return null;

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Corregir jugadas recientes
      </summary>
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        {eventos.map((e) => {
          const clock = extraerClock(e.detalle);
          const clubAbrev =
            e.clubId === describirContext.clubLocalId
              ? abrevClub(describirContext.clubLocalNombre)
              : e.clubId === describirContext.clubVisitanteId
                ? abrevClub(describirContext.clubVisitanteNombre)
                : null;
          return (
            <FilaEventoReciente
              key={e.id}
              partidoId={partidoId}
              evento={e}
              descripcion={describirEvento(e, describirContext)}
              clockLabel={clock?.clockLabel ?? null}
              clubAbrev={clubAbrev}
              convocados={convocados}
            />
          );
        })}
      </div>
    </details>
  );
}

// Cronómetro por cuarto — persistido en DB (Partido.relojEstado/
// relojRestanteSegundos/relojUltimoInicio, ver lib/mesa/reloj.ts). El
// servidor recalcula el tiempo real en cada carga de página (post-acción
// incluida) y lo manda como prop `relojInicial` — esto es lo único confiable
// entre renders. El ticking de acá es 100% visual/cosmético: cuenta hacia
// abajo en el navegador para que se vea fluido, pero se resincroniza con el
// valor del servidor cada vez que `relojInicial` cambia (o sea, en cada
// redirect de cualquier acción de Mesa). Iniciar/Pausar/Reanudar/Reset/
// Ajustar son Server Actions reales — no hay estado de cliente que sobreviva
// por sí solo, la DB manda siempre.
function useCronometroVisual(relojInicial: EstadoRelojCalculado) {
  const [segundos, setSegundos] = useState(relojInicial.remainingSeconds);
  const [corriendoVisual, setCorriendoVisual] = useState(relojInicial.estado === "CORRIENDO");

  useEffect(() => {
    setSegundos(relojInicial.remainingSeconds);
    setCorriendoVisual(relojInicial.estado === "CORRIENDO");
  }, [relojInicial.remainingSeconds, relojInicial.estado]);

  useEffect(() => {
    if (!corriendoVisual) return;
    const id = setInterval(() => {
      setSegundos((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [corriendoVisual]);

  const label = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  return { segundos, corriendoVisual, label };
}

function Cronometro({
  partidoId,
  duracionMinutos,
  cuartoActivo,
  relojInicial,
}: {
  partidoId: string;
  duracionMinutos: number;
  cuartoActivo: number | null;
  relojInicial: EstadoRelojCalculado;
}) {
  const { segundos, corriendoVisual, label } = useCronometroVisual(relojInicial);
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

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
      {editando ? (
        <form
          action={ajustarReloj}
          className="flex items-center gap-1"
          onSubmit={() => setEditando(false)}
        >
          <input type="hidden" name="partidoId" value={partidoId} />
          <input
            name="valor"
            value={valorEdit}
            onChange={(e) => setValorEdit(e.target.value)}
            placeholder="MM:SS"
            className="w-16 rounded-md border border-border bg-background px-1.5 py-1 text-center font-mono text-sm text-foreground"
          />
          <button
            type="submit"
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
        </form>
      ) : (
        <div className="flex items-center gap-1.5">
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
          <Badge tone={corriendoVisual ? "success" : "neutral"}>
            {corriendoVisual ? "CORRIENDO" : "PAUSADO"}
          </Badge>
        </div>
      )}

      {!corriendoVisual ? (
        <form action={iniciarOReanudarReloj}>
          <input type="hidden" name="partidoId" value={partidoId} />
          <button
            type="submit"
            disabled={segundos === 0}
            className="rounded-full bg-accent-orange px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {segundos === duracionMinutos * 60 ? "Iniciar" : "Reanudar"}
          </button>
        </form>
      ) : (
        <form action={pausarReloj}>
          <input type="hidden" name="partidoId" value={partidoId} />
          <button
            type="submit"
            className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted hover:bg-surface-hover active:scale-95"
          >
            Pausar
          </button>
        </form>
      )}
      <form action={resetearReloj}>
        <input type="hidden" name="partidoId" value={partidoId} />
        <button
          type="submit"
          onClick={(e) => {
            if (!window.confirm(`¿Reiniciar el cronómetro a ${duracionMinutos}:00?`)) {
              e.preventDefault();
            }
          }}
          className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted hover:border-danger/60 hover:bg-danger/10 hover:text-danger active:scale-95"
        >
          Reset
        </button>
      </form>
    </div>
  );
}

// Cronómetro visual de 1 minuto para timeouts — puramente informativo para
// la Mesa (no oficial, no persistido). Explícitamente separado del
// cronómetro del partido (Cronometro/useCronometroVisual arriba): no
// comparte estado ni se resincroniza con la DB. Detecta un timeout "fresco"
// comparando una key derivada del último evento vigente; MatchEventLite no
// trae id/createdAt, así que la key usa club+cuarto+detalle (incluye el
// clockLabel del reloj oficial en ese momento, que en la práctica difiere
// entre timeouts distintos). Si se pierde la key (recarga de página a mitad
// del minuto) el cronómetro simplemente no reaparece — aceptado como no
// crítico según el brief.
function useTimeoutCountdown(ultimoEvento: LiveMatchState["ultimoEventoVigente"]) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [keyActiva, setKeyActiva] = useState<string | null>(null);

  useEffect(() => {
    if (!ultimoEvento || ultimoEvento.tipo !== "TIMEOUT") return;
    const key = `${ultimoEvento.clubId}-${ultimoEvento.cuarto}-${JSON.stringify(ultimoEvento.detalle)}`;
    if (key === keyActiva) return;
    setKeyActiva(key);
    setSegundosRestantes(60);
  }, [ultimoEvento, keyActiva]);

  useEffect(() => {
    if (segundosRestantes === null || segundosRestantes <= 0) return;
    const id = setInterval(() => {
      setSegundosRestantes((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => clearInterval(id);
  }, [segundosRestantes]);

  return segundosRestantes !== null && segundosRestantes > 0 ? segundosRestantes : null;
}

function TimeoutCountdown({ segundos }: { segundos: number }) {
  const label = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-accent-orange/40 bg-accent-orange/10 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-orange">Timeout</span>
      <span className="font-mono text-lg font-bold tabular-nums text-accent-orange">{label}</span>
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
        {/* Bonus FIBA: desde la 4ª falta de equipo en el cuarto, todo tiro
            personal siguiente del rival se cobra con lanzamientos libres. */}
        {faltasCuarto >= 4 && (
          <span className="rounded-full bg-danger/20 px-1.5 py-0.5 font-bold text-danger">BONUS</span>
        )}
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
  convocadosLocal,
  convocadosVisitante,
  liveState,
  nombresJugadores,
  duracionCuartoMinutos,
  relojInicial,
  eventosRecientes,
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
  convocadosLocal: JugadorSlot[];
  convocadosVisitante: JugadorSlot[];
  liveState: LiveMatchState;
  nombresJugadores: Map<string, string>;
  duracionCuartoMinutos: number;
  relojInicial: EstadoRelojCalculado;
  eventosRecientes: EventoRecienteRow[];
}) {
  const describirContext: DescribirContext = {
    clubLocalId,
    clubVisitanteId,
    clubLocalNombre,
    clubVisitanteNombre,
    nombresJugadores,
  };
  const descripcionUltimoEvento = describirUltimoEvento(liveState.ultimoEventoVigente, describirContext);
  const segundosTimeout = useTimeoutCountdown(liveState.ultimoEventoVigente);

  // Combina ambos planteles con su club para el editor de jugadas recientes
  // — ahí se puede reasignar un evento al jugador/equipo correcto sin
  // restringirse a "quién está en cancha ahora" (la jugada pudo haber
  // ocurrido con otro lineup).
  const convocadosParaEditor: ConvocadoConClub[] = [
    ...convocadosLocal.map((j) => ({ ...j, clubAbrev: abrevClub(clubLocalNombre) })),
    ...convocadosVisitante.map((j) => ({ ...j, clubAbrev: abrevClub(clubVisitanteNombre) })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Scoreboard: protagonista de la pantalla, sticky para no perderla al scrollear. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ControlCuarto partidoId={partidoId} liveState={liveState} />
          <Cronometro
            partidoId={partidoId}
            duracionMinutos={duracionCuartoMinutos}
            cuartoActivo={liveState.cuartoActivo}
            relojInicial={relojInicial}
          />
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

        {segundosTimeout !== null && <TimeoutCountdown segundos={segundosTimeout} />}

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <BotonTimeout
            partidoId={partidoId}
            clubId={clubLocalId}
            label="Timeout Local"
            contador={liveState.timeoutsLocal}
          />
          <BotonTimeout
            partidoId={partidoId}
            clubId={clubVisitanteId}
            label="Timeout Visita"
            contador={liveState.timeoutsVisitante}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <BotonPosesion
            partidoId={partidoId}
            clubId={clubLocalId}
            label="Posesión Local"
            activa={liveState.posesionEquipo === "LOCAL"}
          />
          <BotonPosesion
            partidoId={partidoId}
            clubId={clubVisitanteId}
            label="Posesión Visita"
            activa={liveState.posesionEquipo === "VISITANTE"}
          />
        </div>

        <BotonDeshacer partidoId={partidoId} descripcion={descripcionUltimoEvento} />
      </div>

      <CorregirJugadasRecientes
        partidoId={partidoId}
        eventos={eventosRecientes}
        describirContext={describirContext}
        convocados={convocadosParaEditor}
      />

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
