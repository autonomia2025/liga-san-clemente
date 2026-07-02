"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { guardarTitulares } from "./actions";

const TITULARES_POR_EQUIPO = 5;

type ConvocadoOption = {
  id: string;
  nombre: string;
  numeroCamiseta: number | null;
};

function TitularesColumna({
  titulo,
  fieldName,
  convocados,
  seleccionados,
  onToggle,
}: {
  titulo: string;
  fieldName: string;
  convocados: ConvocadoOption[];
  seleccionados: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        <Badge tone={seleccionados.size === TITULARES_POR_EQUIPO ? "success" : "neutral"}>
          {seleccionados.size}/{TITULARES_POR_EQUIPO}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        {convocados.map((j) => {
          const checked = seleccionados.has(j.id);
          const disabled = !checked && seleccionados.size >= TITULARES_POR_EQUIPO;
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
              {j.numeroCamiseta !== null && (
                <Badge tone="accent-blue">#{j.numeroCamiseta}</Badge>
              )}
              {checked && (
                <Badge tone="success" className="ml-auto">
                  Titular
                </Badge>
              )}
            </label>
          );
        })}
        {convocados.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted">
            Todavía no hay convocados guardados para este equipo.
          </p>
        )}
      </div>
    </div>
  );
}

export function TitularesForm({
  partidoId,
  clubLocalNombre,
  clubVisitanteNombre,
  convocadosLocal,
  convocadosVisitante,
  titularesLocalInicial,
  titularesVisitanteInicial,
}: {
  partidoId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  convocadosLocal: ConvocadoOption[];
  convocadosVisitante: ConvocadoOption[];
  titularesLocalInicial: string[];
  titularesVisitanteInicial: string[];
}) {
  const [local, setLocal] = useState<Set<string>>(new Set(titularesLocalInicial));
  const [visitante, setVisitante] = useState<Set<string>>(new Set(titularesVisitanteInicial));

  function toggleLocal(id: string) {
    setLocal((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < TITULARES_POR_EQUIPO) next.add(id);
      return next;
    });
  }

  function toggleVisitante(id: string) {
    setVisitante((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < TITULARES_POR_EQUIPO) next.add(id);
      return next;
    });
  }

  return (
    <form action={guardarTitulares} className="flex flex-col gap-4">
      <input type="hidden" name="partidoId" value={partidoId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TitularesColumna
          titulo={clubLocalNombre}
          fieldName="titularesLocal"
          convocados={convocadosLocal}
          seleccionados={local}
          onToggle={toggleLocal}
        />
        <TitularesColumna
          titulo={clubVisitanteNombre}
          fieldName="titularesVisitante"
          convocados={convocadosVisitante}
          seleccionados={visitante}
          onToggle={toggleVisitante}
        />
      </div>

      <button
        type="submit"
        className="w-fit rounded-md bg-accent-orange px-4 py-3 text-sm font-medium text-white hover:opacity-90 active:scale-95"
      >
        Guardar titulares
      </button>
    </form>
  );
}
