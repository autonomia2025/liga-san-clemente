"use client";

// Único borrado físico del admin — confirmación explícita porque no se puede
// deshacer (a diferencia de Desactivar, que es reversible).
export function DeleteJugadorButton({ nombre }: { nombre: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`¿Eliminar a ${nombre} definitivamente? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 active:scale-95"
    >
      Eliminar
    </button>
  );
}
