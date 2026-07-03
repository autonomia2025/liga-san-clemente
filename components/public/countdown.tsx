"use client";

import { useEffect, useState } from "react";

// Cuenta regresiva a la próxima jornada. Isla client aislada (no hay librerías
// nuevas). El objetivo es un instante real: el primer partido de la próxima
// jornada (Partido.fechaHora). Para evitar mismatch de hidratación, arranca en
// null y recién calcula en el cliente tras montar; hasta entonces muestra "--".
type Parts = { d: number; h: number; m: number; s: number };

function diffToParts(targetMs: number): Parts | null {
  const diff = targetMs - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  let s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return { d, h, m, s };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function Countdown({ targetMs }: { targetMs: number }) {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(diffToParts(targetMs));
    const id = setInterval(() => setParts(diffToParts(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const celdas: { valor: string; label: string }[] = [
    { valor: parts ? pad(parts.d) : "--", label: "días" },
    { valor: parts ? pad(parts.h) : "--", label: "hrs" },
    { valor: parts ? pad(parts.m) : "--", label: "min" },
    { valor: parts ? pad(parts.s) : "--", label: "seg" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2" aria-live="polite">
      {celdas.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-background/60 px-1 py-2.5 text-center">
          <span className="block font-mono text-2xl font-extrabold tabular-nums text-foreground">{c.valor}</span>
          <span className="font-ui text-[10px] font-semibold uppercase tracking-wider text-muted">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
