"use client";

import { useRouter } from "next/navigation";

// Estado de error visual (no técnico) reutilizable por módulo de la Home.
// El botón Reintentar hace router.refresh() (re-ejecuta el server render de la
// Home), sin exponer stack traces ni mensajes técnicos.
export function ModuleError({
  label,
  minHeight = "min-h-[260px]",
}: {
  label: string;
  minHeight?: string;
}) {
  const router = useRouter();
  return (
    <div
      role="alert"
      className={`flex ${minHeight} flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-bg-elevated p-8 text-center`}
    >
      <p className="max-w-sm font-body text-sm text-text-secondary">
        No pudimos cargar la información en este momento.
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        aria-label={`Reintentar cargar ${label}`}
        className="rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
      >
        Reintentar
      </button>
    </div>
  );
}
