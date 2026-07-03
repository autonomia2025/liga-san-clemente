import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { HeroSection } from "@/components/site/hero-section";
import { MiniStats } from "@/components/site/mini-stats";
import { MatchFeature, type MatchState } from "@/components/site/match-feature";
import { StandingsPreview, type StandingPreviewTeam } from "@/components/site/standings-preview";

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

// PR Preview 2.0 — Home con Navbar + Hero + MatchFeature + StandingsPreview +
// mini-stats. Todavía SIN datos reales; todo mock para revisar visualmente.
// Cambiá MOCK_MATCH_STATE entre "live" | "upcoming" | "none".
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

// Mock de standings (solo visual, sin datos reales de la liga).
const MOCK_STANDINGS: StandingPreviewTeam[] = [
  { position: 1, team: { name: "Equipo Uno", abbr: "E1", color: "#FBBF24" }, played: 1, wins: 1, losses: 0, pointDiff: 15, tablePoints: 2, streak: "win" },
  { position: 2, team: { name: "Equipo Dos", abbr: "E2", color: "#7C3AED" }, played: 1, wins: 1, losses: 0, pointDiff: 11, tablePoints: 2, streak: "win" },
  { position: 3, team: { name: "Equipo Tres", abbr: "E3", color: "#F97316" }, played: 1, wins: 1, losses: 0, pointDiff: 8, tablePoints: 2, streak: null },
  { position: 4, team: { name: "Equipo Cuatro", abbr: "E4", color: "#3B82F6" }, played: 1, wins: 0, losses: 1, pointDiff: -4, tablePoints: 1, streak: "loss" },
  { position: 5, team: { name: "Equipo Cinco", abbr: "E5", color: "#9CA3AF" }, played: 1, wins: 0, losses: 1, pointDiff: -9, tablePoints: 1, streak: "loss" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />
      <HeroSection />
      <MatchFeature matchState={MOCK_MATCH_STATE} {...MOCK_MATCH} />
      <StandingsPreview
        seasonLabel="TEMPORADA 2026"
        title="TABLA DE POSICIONES"
        href="/tabla"
        teams={MOCK_STANDINGS}
      />
      <MiniStats />
    </div>
  );
}
