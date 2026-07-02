"use client";

import { useEffect } from "react";
import Link from "next/link";

// error.tsx de Next.js: boundary de errores para todo el árbol de /admin.
// No se muestra nada técnico al usuario (mensaje de servidor, stack, etc.);
// sí se loguea a la consola del servidor/navegador para diagnóstico interno.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en Admin:", error);
  }, [error]);

  return (
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M12 3l9 16H3z"
          />
        </svg>
      </span>
      <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted">
        Ocurrió un error inesperado cargando esta sección. Podés reintentar o volver al resumen.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          Reintentar
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Ir al resumen
        </Link>
      </div>
    </div>
  );
}
