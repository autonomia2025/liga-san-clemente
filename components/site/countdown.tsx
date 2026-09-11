"use client";

import { useCountdown } from "@/hooks/use-countdown";

// Contador regresivo compartido (franja de playoffs, previa del partido,
// /en-vivo). Toda la lógica de tiempo vive en useCountdown; acá solo se
// dibuja. Mientras el hook devuelve null (primer render, antes del effect) se
// muestran "--" para que el HTML del servidor y el del cliente coincidan.

export type CountdownProps = {
  target: string;
  size?: "md" | "lg" | "xl";
  tone?: "gold" | "silver" | "white";
  // Texto cuando el instante ya pasó (el hook queda en 0 y no va a negativo).
  zeroLabel?: string;
  className?: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const NUMERO = {
  md: "text-2xl sm:text-3xl",
  lg: "text-4xl sm:text-5xl",
  xl: "text-5xl sm:text-7xl",
} as const;

const SEPARADOR = {
  md: "text-xl sm:text-2xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-6xl",
} as const;

const TONO = {
  gold: "text-accent-gold",
  silver: "text-accent-silver",
  white: "text-text-primary",
} as const;

export function Countdown({ target, size = "md", tone = "gold", zeroLabel = "Por comenzar", className = "" }: CountdownProps) {
  const cd = useCountdown(target);

  if (cd && cd.d === 0 && cd.h === 0 && cd.m === 0 && cd.s === 0) {
    return (
      <span className={`font-head uppercase leading-none tracking-tight ${TONO[tone]} ${SEPARADOR[size]} ${className}`}>
        {zeroLabel}
      </span>
    );
  }

  // Sin días cuando falta menos de uno: "00 días" le quita urgencia justo el
  // día del partido.
  const celdas = [
    ...(cd === null || cd.d > 0 ? [{ valor: cd ? pad(cd.d) : "--", label: "Días" }] : []),
    { valor: cd ? pad(cd.h) : "--", label: "Hrs" },
    { valor: cd ? pad(cd.m) : "--", label: "Min" },
    { valor: cd ? pad(cd.s) : "--", label: "Seg" },
  ];

  return (
    <div className={`flex items-end gap-1.5 ${className}`} role="timer" aria-live="off">
      {celdas.map((c, i) => (
        <div key={c.label} className="flex items-end">
          <div className="flex flex-col items-center">
            <span className={`font-head leading-none tabular-nums ${TONO[tone]} ${NUMERO[size]}`}>{c.valor}</span>
            <span className="mt-1 font-body text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
              {c.label}
            </span>
          </div>
          {i < celdas.length - 1 && (
            <span className={`px-0.5 pb-4 font-head leading-none text-text-secondary/60 ${SEPARADOR[size]}`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
