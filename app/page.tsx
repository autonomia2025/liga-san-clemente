export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-blue text-sm font-bold text-white">
            SC
          </span>
          <span className="text-sm font-semibold tracking-wide">
            LIGA SC
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <span>Fixture</span>
          <span>Posiciones</span>
          <span>Goleadores</span>
          <span>Equipos</span>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Game Center — próximamente
        </span>
        <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          El seguimiento en vivo de la Liga SC
        </h1>
        <p className="max-w-md text-sm text-muted">
          Resultados, fixture, tabla de posiciones y estadísticas reales de
          cada partido, directo desde la mesa.
        </p>

        <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {["En vivo", "Fixture", "Posiciones", "Goleadores"].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border bg-surface px-4 py-6 text-sm font-medium text-muted"
            >
              {item}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
