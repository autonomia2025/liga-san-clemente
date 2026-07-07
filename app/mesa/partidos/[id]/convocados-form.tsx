"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { updateNumeroCamisetaInline } from "@/lib/actions/jugadores";
import { guardarConvocados } from "./actions";

const MAX_CONVOCADOS = 12;

type JugadorOption = {
  id: string;
  nombre: string;
  numeroCamiseta: number | null;
};

// Edición del dorsal en el momento de armar convocados. No puede ser un
// <form> propio: la fila vive dentro del <form action={guardarConvocados}>
// grande de toda la nómina, y HTML no permite <form> anidado. Se llama a la
// server action directo desde el botón (sin form/redirect) — así el
// operador no pierde los checkboxes que ya marcó pero todavía no guardó.
function NumeroInline({
  jugadorId,
  numeroInicial,
  partidoId,
}: {
  jugadorId: string;
  numeroInicial: number | null;
  partidoId: string;
}) {
  const [valor, setValor] = useState(numeroInicial !== null ? String(numeroInicial) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await updateNumeroCamisetaInline(jugadorId, valor, partidoId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span className="text-xs text-muted">#</span>
      <input
        type="number"
        min={0}
        max={99}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="—"
        aria-label="Número de camiseta"
        className="w-12 rounded-md border border-border bg-background px-1 py-1 text-xs text-foreground"
      />
      <button
        type="button"
        onClick={guardar}
        disabled={pending}
        className="rounded-md border border-border px-1.5 py-1 text-[10px] font-semibold text-muted hover:bg-surface-hover active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      >
        {pending ? "..." : "OK"}
      </button>
      {error && <span className="max-w-[7rem] text-[10px] text-danger">{error}</span>}
    </span>
  );
}

function ConvocadosColumna({
  titulo,
  fieldName,
  jugadores,
  seleccionados,
  onToggle,
  partidoId,
}: {
  titulo: string;
  fieldName: string;
  jugadores: JugadorOption[];
  seleccionados: Set<string>;
  onToggle: (id: string) => void;
  partidoId: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        <Badge tone={seleccionados.size >= MAX_CONVOCADOS ? "accent-orange" : "neutral"}>
          {seleccionados.size}/{MAX_CONVOCADOS}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        {jugadores.map((j) => {
          const checked = seleccionados.has(j.id);
          const disabled = !checked && seleccionados.size >= MAX_CONVOCADOS;
          return (
            <div
              key={j.id}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                disabled ? "opacity-40" : "hover:bg-surface-hover"
              }`}
            >
              <label
                className={`flex min-w-0 flex-1 items-center gap-2 ${disabled ? "" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  name={fieldName}
                  value={j.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(j.id)}
                />
                <span className="truncate text-foreground">{j.nombre}</span>
              </label>
              <NumeroInline jugadorId={j.id} numeroInicial={j.numeroCamiseta} partidoId={partidoId} />
            </div>
          );
        })}
        {jugadores.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted">Este club no tiene jugadores cargados.</p>
        )}
      </div>
    </div>
  );
}

export function ConvocadosForm({
  partidoId,
  clubLocalNombre,
  clubVisitanteNombre,
  jugadoresLocal,
  jugadoresVisitante,
  seleccionadosLocalInicial,
  seleccionadosVisitanteInicial,
}: {
  partidoId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  jugadoresLocal: JugadorOption[];
  jugadoresVisitante: JugadorOption[];
  seleccionadosLocalInicial: string[];
  seleccionadosVisitanteInicial: string[];
}) {
  const [local, setLocal] = useState<Set<string>>(new Set(seleccionadosLocalInicial));
  const [visitante, setVisitante] = useState<Set<string>>(new Set(seleccionadosVisitanteInicial));

  function toggleLocal(id: string) {
    setLocal((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CONVOCADOS) next.add(id);
      return next;
    });
  }

  function toggleVisitante(id: string) {
    setVisitante((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_CONVOCADOS) next.add(id);
      return next;
    });
  }

  return (
    <form action={guardarConvocados} className="flex flex-col gap-4">
      <input type="hidden" name="partidoId" value={partidoId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ConvocadosColumna
          titulo={clubLocalNombre}
          fieldName="convocadosLocal"
          jugadores={jugadoresLocal}
          seleccionados={local}
          onToggle={toggleLocal}
          partidoId={partidoId}
        />
        <ConvocadosColumna
          titulo={clubVisitanteNombre}
          fieldName="convocadosVisitante"
          jugadores={jugadoresVisitante}
          seleccionados={visitante}
          onToggle={toggleVisitante}
          partidoId={partidoId}
        />
      </div>

      <button
        type="submit"
        className="w-fit rounded-md bg-accent-orange px-4 py-3 text-sm font-medium text-white hover:opacity-90 active:scale-95"
      >
        Guardar convocados
      </button>
    </form>
  );
}
