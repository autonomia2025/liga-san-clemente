"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { guardarConvocados } from "./actions";

const MAX_CONVOCADOS = 12;

type JugadorOption = {
  id: string;
  nombre: string;
  numeroCamiseta: number | null;
};

function ConvocadosColumna({
  titulo,
  fieldName,
  jugadores,
  seleccionados,
  onToggle,
}: {
  titulo: string;
  fieldName: string;
  jugadores: JugadorOption[];
  seleccionados: Set<string>;
  onToggle: (id: string) => void;
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
            <label
              key={j.id}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                disabled ? "opacity-40" : "cursor-pointer hover:bg-surface-hover"
              }`}
            >
              <input
                type="checkbox"
                name={fieldName}
                value={j.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(j.id)}
              />
              <span className="text-foreground">{j.nombre}</span>
              <Badge tone={j.numeroCamiseta !== null ? "accent-blue" : "accent-orange"} className="ml-auto">
                {j.numeroCamiseta !== null ? `#${j.numeroCamiseta}` : "Sin dorsal"}
              </Badge>
            </label>
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
        />
        <ConvocadosColumna
          titulo={clubVisitanteNombre}
          fieldName="convocadosVisitante"
          jugadores={jugadoresVisitante}
          seleccionados={visitante}
          onToggle={toggleVisitante}
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
