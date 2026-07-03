import Link from "next/link";

export default function CalendarioPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-5 py-16 text-text-primary">
      <div className="max-w-xl text-center">
        <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
          Calendario LBSC
        </span>
        <h1 className="mt-3 font-head text-5xl uppercase leading-none tracking-tight sm:text-6xl">
          Próximamente
        </h1>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
