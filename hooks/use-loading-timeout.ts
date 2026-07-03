"use client";

import { useEffect, useState } from "react";

// Hook reusable preparado para el futuro (cuando conectemos datos reales):
// mientras un módulo esté `loading`, si pasa `maxMs` sin resolver, devuelve
// `true` para que el módulo pase a estado de error en vez de quedar con
// skeleton infinito.
//
// Importante: NO introduce lógica de DB y el timer SOLO corre cuando
// loading === true. Si no se está cargando nada, no arma ningún setTimeout
// (no afecta producción cuando solo mostramos datos mockeados).
export function useLoadingTimeout(loading: boolean, maxMs = 8000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), maxMs);
    return () => clearTimeout(t);
  }, [loading, maxMs]);

  return timedOut;
}
