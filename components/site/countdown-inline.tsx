"use client";

import { useCountdown } from "@/hooks/use-countdown";

// Variante en una línea del contador ("2d 04:10:33"), para espacios donde
// Countdown —con celdas y labels— no entra, como la franja de la final.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function CountdownInline({ target, zeroLabel = "Por comenzar" }: { target: string; zeroLabel?: string }) {
  const cd = useCountdown(target);
  if (!cd) return <span className="tabular-nums">--:--:--</span>;
  if (cd.d === 0 && cd.h === 0 && cd.m === 0 && cd.s === 0) return <span>{zeroLabel}</span>;
  return (
    <span className="tabular-nums" role="timer" aria-live="off">
      {cd.d > 0 && `${cd.d}d `}
      {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
    </span>
  );
}
