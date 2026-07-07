"use client";

import { useEffect, useState } from "react";

// Reloj público de /en-vivo — misma idea que el cronómetro de Mesa
// (components client-side ticking, DB como fuente de verdad): el server
// manda el snapshot real en cada carga/refresh (ver LiveRefresher, cada 8s),
// y acá solo se hace un ticking visual entre refrescos para que no se vea
// congelado. Nunca inventa tiempo: si está PAUSADO, no tickea.
export function LiveClock({
  estado,
  remainingSeconds,
}: {
  estado: "CORRIENDO" | "PAUSADO";
  remainingSeconds: number;
}) {
  const [segundos, setSegundos] = useState(remainingSeconds);

  useEffect(() => {
    setSegundos(remainingSeconds);
  }, [remainingSeconds, estado]);

  useEffect(() => {
    if (estado !== "CORRIENDO") return;
    const id = setInterval(() => {
      setSegundos((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [estado]);

  const label = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  return <span className="font-mono tabular-nums">{label}</span>;
}
