"use client";

import { useEffect, useState } from "react";

// Cuenta regresiva a un instante futuro. Extraído de UpcomingState en
// components/site/match-feature.tsx, donde vivía inline, para que la franja de
// playoffs de la Home use exactamente la misma lógica en vez de una copia que
// pueda derivar.
//
// Devuelve null en el primer render y recién arranca en el effect: eso es a
// propósito, no una omisión. Leer Date.now() durante el render haría que el
// HTML del servidor y el del cliente difieran y React tire un error de
// hidratación. El llamador muestra un placeholder ("--") mientras sea null.
//
// Cuando el instante ya pasó, todos los campos quedan en 0 (no va a negativo).

export type Countdown = { d: number; h: number; m: number; s: number };

export function useCountdown(target: string | Date | null | undefined): Countdown | null {
  const [cd, setCd] = useState<Countdown | null>(null);

  // Se normaliza a número para que el effect no se re-dispare cuando el
  // llamador pasa un objeto Date nuevo con el mismo instante en cada render.
  const targetMs = target ? new Date(target).getTime() : null;

  useEffect(() => {
    if (targetMs === null || Number.isNaN(targetMs)) {
      setCd(null);
      return;
    }
    const tick = () => {
      const diff = Math.max(targetMs - Date.now(), 0);
      let s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      s -= d * 86400;
      const h = Math.floor(s / 3600);
      s -= h * 3600;
      const m = Math.floor(s / 60);
      s -= m * 60;
      setCd({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return cd;
}
