// Loading UI compartido y liviano — sin shimmer/skeleton pixel-perfect por
// ruta (eso sería sobre-ingeniería para lo que tarda esta app en responder).
// Solo bloques pulsantes simples con animate-pulse (ya nativo de Tailwind)
// para dar una señal clara de "esto está cargando" sin sentirse pesado.
export function LoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-40 animate-pulse rounded-md bg-surface-hover" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-surface-hover" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
