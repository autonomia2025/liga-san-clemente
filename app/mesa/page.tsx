export default function MesaHome() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        Partidos disponibles para operar
      </h1>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="max-w-sm text-center text-sm text-muted">
          Todavía no hay partidos confirmados para operar. Cuando el Admin
          confirme un partido, va a aparecer acá. Se implementa en Fase 2.
        </p>
      </div>
    </div>
  );
}
