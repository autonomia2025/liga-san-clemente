"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresco automático de /en-vivo — no hay WebSockets todavía (fuera de
// scope), así que se resuelve con router.refresh() cada pocos segundos.
// Re-ejecuta la carga de datos del server component (force-dynamic) sin
// perder el scroll ni el estado de la página, a diferencia de una recarga
// completa.
export function LiveRefresher({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
