"use client";

import { ModuleError } from "@/components/site/module-error";

// Skeletons y error states para los módulos que en el futuro vendrán de datos
// (MatchFeature, StandingsPreview, MvpLeadersSection, TeamsGrid). Preparados
// para ese momento; hoy no se renderizan en la Home (que usa los componentes
// con mocks). Sin spinners genéricos: cada skeleton respeta la geometría del
// componente final. El shimmer es CSS puro (.lbsc-skeleton) y respeta
// prefers-reduced-motion.

/* ===========================================================================
   SKELETONS
=========================================================================== */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`lbsc-skeleton rounded ${className}`} aria-hidden="true" />;
}

export function MatchFeatureSkeleton() {
  return (
    <section className="lbsc-container lbsc-section-tight" aria-busy="true" aria-label="Cargando partido">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Bar className="h-6 w-24 rounded-full" />
          <Bar className="h-5 w-20" />
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-14">
          <div className="flex flex-1 flex-col items-center gap-3">
            <Bar className="h-14 w-14 rounded-2xl" />
            <Bar className="h-3 w-20" />
          </div>
          <Bar className="h-16 w-40 rounded-xl" />
          <div className="flex flex-1 flex-col items-center gap-3">
            <Bar className="h-14 w-14 rounded-2xl" />
            <Bar className="h-3 w-20" />
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Bar className="h-10 w-52 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function StandingsPreviewSkeleton() {
  return (
    <section className="lbsc-container lbsc-section-tight" aria-busy="true" aria-label="Cargando tabla">
      <div className="mb-6 flex flex-col gap-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-8 w-64" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-bg-base ring-1 ring-white/[0.06]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex min-h-[56px] items-center gap-3 border-t border-bg-elevated px-3 py-2.5 first:border-t-0 sm:px-5">
            <Bar className="h-5 w-5" />
            <Bar className="h-8 w-8 rounded-lg" />
            <Bar className="h-4 w-28" />
            <div className="ml-auto hidden items-center gap-5 sm:flex">
              <Bar className="h-4 w-10" />
              <Bar className="h-4 w-12" />
              <Bar className="h-4 w-8" />
            </div>
            <Bar className="ml-auto h-8 w-10 sm:ml-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MvpLeadersSkeleton() {
  return (
    <section className="lbsc-container lbsc-section-tight" aria-busy="true" aria-label="Cargando MVP">
      <div className="mb-6 flex flex-col gap-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-8 w-52" />
      </div>
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-bg-elevated lg:grid-cols-[0.9fr_1.1fr]">
        <div className="p-4 sm:p-5 lg:p-6">
          <Bar className="aspect-[4/5] w-full rounded-2xl lg:h-full lg:min-h-[420px]" />
        </div>
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
          <Bar className="h-4 w-28" />
          <Bar className="h-24 w-40 rounded-xl" />
          <Bar className="h-8 w-56" />
          <div className="flex items-center gap-3 border-t border-white/10 pt-5">
            <Bar className="h-8 w-24 rounded-lg" />
            <Bar className="h-6 w-16" />
            <Bar className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Bar className="h-3 w-24" />
            <div className="flex items-center gap-3">
              <Bar className="h-11 w-11 rounded-xl" />
              <div className="flex flex-col gap-1.5">
                <Bar className="h-3 w-28" />
                <Bar className="h-2.5 w-20" />
              </div>
            </div>
            <Bar className="h-9 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function TeamsGridSkeleton() {
  return (
    <section className="lbsc-container lbsc-section-tight" aria-busy="true" aria-label="Cargando equipos">
      <div className="mb-8 flex flex-col gap-2">
        <Bar className="h-3 w-48" />
        <Bar className="h-8 w-72" />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-y-10 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex flex-col items-center gap-3">
            <Bar className="aspect-square w-20 rounded-[30%] sm:w-24 lg:w-28" />
            <Bar className="h-4 w-20" />
            <Bar className="h-2.5 w-14" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ===========================================================================
   ERROR STATES (visuales, no técnicos). El retry vive en ModuleError
   (router.refresh()), self-contained, así funciona renderizado desde el
   Server Component de la Home sin pasar funciones por props.
=========================================================================== */

export function MatchFeatureError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="el partido" minHeight="min-h-[260px]" />
    </section>
  );
}

export function StandingsPreviewError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="la tabla" minHeight="min-h-[300px]" />
    </section>
  );
}

export function MvpLeadersError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="las figuras" minHeight="min-h-[300px]" />
    </section>
  );
}

export function TeamsGridError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="los equipos" minHeight="min-h-[260px]" />
    </section>
  );
}

export function FixturePreviewError() {
  return (
    <section id="calendario" className="lbsc-container lbsc-section-tight">
      <ModuleError label="el fixture" minHeight="min-h-[260px]" />
    </section>
  );
}
