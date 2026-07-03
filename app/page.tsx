import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { HeroSection } from "@/components/site/hero-section";
import { MiniStats } from "@/components/site/mini-stats";
import { MatchFeature, type MatchState } from "@/components/site/match-feature";

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

// PR Preview 2.0 — Home con Navbar + Hero + MatchFeature + mini-stats.
// Todavía SIN datos reales. Cambiá MOCK_MATCH_STATE entre "live" | "upcoming"
// | "none" para revisar los 3 estados del módulo. Más adelante MatchFeature
// se conectará a datos reales por props, no ahora.
const MOCK_MATCH_STATE: MatchState = "live"; // "live" | "upcoming" | "none"

const MOCK_MATCH = {
  homeTeam: { name: "Equipo Local", abbr: "LOC", color: "#7C3AED" },
  awayTeam: { name: "Equipo Visitante", abbr: "VIS", color: "#F97316" },
  homeScore: 54,
  awayScore: 44,
  periodLabel: "3ER CUARTO",
  gameClock: "06:42",
  scheduledAt: new Date("2026-07-05T20:40:00-04:00"),
  venue: "Polideportivo San Clemente",
  leaders: [
    { name: "Jugador Local", initials: "JL", points: 18, teamAbbr: "LOC" },
    { name: "Jugador Visita", initials: "JV", points: 14, teamAbbr: "VIS" },
    { name: "Base Local", initials: "BL", points: 12, teamAbbr: "LOC" },
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />
      <HeroSection />
      <MatchFeature matchState={MOCK_MATCH_STATE} {...MOCK_MATCH} />
      <MiniStats />
    </div>
  );
}
