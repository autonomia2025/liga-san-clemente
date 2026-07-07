import { updateNumeroCamiseta } from "@/lib/actions/jugadores";

// Edición rápida de dorsal desde Mesa: antes solo se podía cambiar el número
// de camiseta desde Admin, pero un operador de Mesa detecta el error justo
// antes/durante el partido y necesita corregirlo ahí mismo, sin salir de
// Mesa. Reutiliza la misma acción que ya usa la nómina de Admin (no chequea
// rol, solo actualiza Jugador.numeroCamiseta) — no hace falta una acción
// nueva. Server component: no necesita estado de cliente, cada fila es un
// <form> independiente.

type JugadorOption = {
  id: string;
  nombre: string;
  numeroCamiseta: number | null;
};

function NumeroCamisetaColumna({
  titulo,
  jugadores,
  returnTo,
}: {
  titulo: string;
  jugadores: JugadorOption[];
  returnTo: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>

      <div className="flex flex-col divide-y divide-border">
        {jugadores.map((j) => (
          <div key={j.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0 truncate text-sm text-foreground">{j.nombre}</span>
            <form action={updateNumeroCamiseta} className="flex shrink-0 items-center gap-1.5">
              <input type="hidden" name="jugadorId" value={j.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name="numeroCamiseta"
                type="number"
                min={0}
                max={99}
                defaultValue={j.numeroCamiseta ?? ""}
                placeholder="Sin #"
                className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />
              <button
                type="submit"
                className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                Guardar
              </button>
            </form>
          </div>
        ))}
        {jugadores.length === 0 && (
          <p className="py-2 text-sm text-muted">Este club no tiene jugadores cargados.</p>
        )}
      </div>
    </div>
  );
}

export function NumerosCamisetaForm({
  partidoId,
  clubLocalNombre,
  clubVisitanteNombre,
  jugadoresLocal,
  jugadoresVisitante,
}: {
  partidoId: string;
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  jugadoresLocal: JugadorOption[];
  jugadoresVisitante: JugadorOption[];
}) {
  const returnTo = `/mesa/partidos/${partidoId}`;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NumeroCamisetaColumna titulo={clubLocalNombre} jugadores={jugadoresLocal} returnTo={returnTo} />
      <NumeroCamisetaColumna titulo={clubVisitanteNombre} jugadores={jugadoresVisitante} returnTo={returnTo} />
    </div>
  );
}
