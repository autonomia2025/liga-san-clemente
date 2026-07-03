import type { Metadata } from "next";

// Placeholder de detalle de equipo (PR preview). Sin DB, sin roster, sin stats:
// solo evita que los links del grid de equipos rompan. El nombre real se
// resolverá más adelante; por ahora se muestra el slug.
export const metadata: Metadata = {
  title: "Equipo | LBSC 2026",
  robots: { index: false, follow: false },
};

export default async function EquipoPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg-base px-6 text-center font-body text-text-primary">
      <span className="font-head text-xl uppercase tracking-wide text-text-primary">
        LBSC<span className="text-accent-purple">·</span>2026
      </span>
      <h1 className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
        Página de {slug} · próximamente
      </h1>
      <a
        href="/"
        className="rounded-full border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
      >
        Volver al inicio
      </a>
    </div>
  );
}
