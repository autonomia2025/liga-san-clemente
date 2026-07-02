// Skeleton propio (no el genérico LoadingState) porque esta pantalla es muy
// distinta a una lista de cards: scoreboard grande arriba + grilla de
// jugadores abajo. Sigue siendo simple — solo bloques con animate-pulse.
export default function PartidoMesaLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 animate-fade-in">
      <div className="h-6 w-32 animate-pulse rounded-full bg-surface-hover" />
      <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
      <div className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
