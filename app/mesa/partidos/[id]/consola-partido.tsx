type JugadorSlot = { id: string; nombre: string; numeroCamiseta: number | null };

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function JugadorCanchaCard({ jugador }: { jugador: JugadorSlot }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface p-4">
      <span className="text-3xl font-bold text-foreground">
        {jugador.numeroCamiseta !== null ? `#${jugador.numeroCamiseta}` : iniciales(jugador.nombre)}
      </span>
      <span className="text-center text-xs text-muted">{jugador.nombre}</span>
    </div>
  );
}

function JugadorBancaCard({ jugador }: { jugador: JugadorSlot }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-sm text-foreground">{jugador.nombre}</span>
      <div className="flex items-center gap-2">
        {jugador.numeroCamiseta !== null && (
          <span className="rounded-full bg-accent-blue/20 px-2 py-0.5 text-xs text-accent-blue">
            #{jugador.numeroCamiseta}
          </span>
        )}
        <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs text-muted">Banca</span>
      </div>
    </div>
  );
}

const ACCIONES_PLACEHOLDER = [
  "+1",
  "+2",
  "+3",
  "Falta",
  "Sustitución",
  "Timeout",
  "Posesión",
  "Iniciar cuarto",
];

export function ConsolaPartido({
  clubLocalNombre,
  clubVisitanteNombre,
  canchaLocal,
  canchaVisitante,
  bancaLocal,
  bancaVisitante,
}: {
  clubLocalNombre: string;
  clubVisitanteNombre: string;
  canchaLocal: JugadorSlot[];
  canchaVisitante: JugadorSlot[];
  bancaLocal: JugadorSlot[];
  bancaVisitante: JugadorSlot[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-medium text-foreground">{clubLocalNombre}</span>
          <span className="text-3xl font-bold text-foreground">0 - 0</span>
          <span className="text-base font-medium text-foreground">{clubVisitanteNombre}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-accent-orange/20 px-2 py-1 text-accent-orange">
            Q1
          </span>
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Posesión: sin asignar</span>
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Faltas Local: 0</span>
          <span className="rounded-full bg-zinc-500/20 px-2 py-1">Faltas Visita: 0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">{clubLocalNombre} — Cancha</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canchaLocal.map((j) => (
              <JugadorCanchaCard key={j.id} jugador={j} />
            ))}
          </div>
          {canchaLocal.length === 0 && (
            <p className="text-sm text-muted">Sin jugadores en cancha todavía.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {clubVisitanteNombre} — Cancha
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canchaVisitante.map((j) => (
              <JugadorCanchaCard key={j.id} jugador={j} />
            ))}
          </div>
          {canchaVisitante.length === 0 && (
            <p className="text-sm text-muted">Sin jugadores en cancha todavía.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">{clubLocalNombre} — Banca</h3>
          <div className="flex flex-col gap-1">
            {bancaLocal.map((j) => (
              <JugadorBancaCard key={j.id} jugador={j} />
            ))}
            {bancaLocal.length === 0 && <p className="text-sm text-muted">Sin jugadores en banca.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {clubVisitanteNombre} — Banca
          </h3>
          <div className="flex flex-col gap-1">
            {bancaVisitante.map((j) => (
              <JugadorBancaCard key={j.id} jugador={j} />
            ))}
            {bancaVisitante.length === 0 && (
              <p className="text-sm text-muted">Sin jugadores en banca.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
        <p className="text-xs text-muted">Registro del partido — próximamente</p>
        <div className="flex flex-wrap gap-2">
          {ACCIONES_PLACEHOLDER.map((accion) => (
            <button
              key={accion}
              type="button"
              disabled
              title="Próximamente"
              className="cursor-not-allowed rounded-md border border-border px-3 py-2 text-xs text-muted opacity-50"
            >
              {accion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
