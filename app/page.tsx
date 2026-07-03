import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { HeroSection } from "@/components/site/hero-section";
import { MiniStats } from "@/components/site/mini-stats";

export const metadata: Metadata = {
  title: "LBSC 2026 | Liga de Básquetbol San Clemente",
  description:
    "Liga de Básquetbol San Clemente — Temporada 2026. 8 equipos, una sola pasión.",
  openGraph: {
    title: "LBSC 2026 | Liga de Básquetbol San Clemente",
    description:
      "Liga de Básquetbol San Clemente — Temporada 2026. 8 equipos, una sola pasión.",
    type: "website",
    locale: "es_CL",
  },
};

// PR Preview 2.0 — Home solo con Navbar + Hero + mini-stats. Todavía SIN datos
// reales: isLiveNow va mockeado (cambialo a true para revisar el estado en vivo).
// Más adelante se conectará a getPartidosEnVivo(), no ahora.
export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />
      <HeroSection />
      <MiniStats />
    </div>
  );
}
