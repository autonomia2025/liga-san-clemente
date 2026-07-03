import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { PageTransition } from "@/components/site/page-transition";
import { HeroSection } from "@/components/site/hero-section";
import { MatchFeature } from "@/components/site/match-feature";
import { StandingsPreview } from "@/components/site/standings-preview";
import { MvpLeadersSection } from "@/components/site/mvp-leaders-section";
import { TeamsGrid } from "@/components/site/teams-grid";
import { HistorySection } from "@/components/site/history-section";
import { FixturePreview } from "@/components/site/fixture-preview";
import { SponsorsSection, type Sponsor } from "@/components/site/sponsors-section";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  MatchFeatureError,
  StandingsPreviewError,
  MvpLeadersError,
  TeamsGridError,
  FixturePreviewError,
} from "@/components/site/loading-states";
import { getHomePageData } from "@/lib/public/home-live-data";

// Depende de datos en vivo (partido en curso, próxima jornada, standings) →
// no puede quedar prerenderizada estática; se resuelve en cada request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LBSC 2026 — Liga de Básquetbol San Clemente | Temporada 2026",
  description:
    "Resultados, calendario, tabla de posiciones y comunidad de la Liga de Básquetbol San Clemente 2026.",
  openGraph: {
    title: "LBSC 2026 — Liga de Básquetbol San Clemente | Temporada 2026",
    description:
      "Resultados, calendario, tabla de posiciones y comunidad de la Liga de Básquetbol San Clemente 2026.",
    type: "website",
    locale: "es_CL",
    // TODO: agregar og-image real cuando tengamos escudo/foto oficial en /public.
  },
};

// Historia, auspiciadores y footer siguen con constantes/placeholders por ahora
// (no son dinámicos en este PR). El resto de la Home usa datos reales de DB vía
// getHomePageData(), con estado de error por módulo si una query falla.
const MOCK_SPONSORS: Sponsor[] = [
  { name: "Spalding", tier: "main", label: "Auspiciador Oficial" },
  { name: "Depore", tier: "support" },
  { name: "CCF", tier: "support" },
  { name: "Meneagro", tier: "support" },
  { name: "MV Nutrition", tier: "support" },
];

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "#en-vivo" },
  { label: "Tabla", href: "#tabla" },
  { label: "Calendario", href: "#calendario" },
  { label: "Equipos", href: "#equipos" },
];

const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Facebook", href: "#" },
];

export default async function Home() {
  const data = await getHomePageData();

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      {/* Navbar fuera de PageTransition: es fixed y el transform del wrapper le
          rompería el posicionamiento. isLiveNow viene de datos reales. */}
      <Navbar isLiveNow={data.isLiveNow} />

      <main className="pt-[var(--navbar-height)]">
        <PageTransition>
          <HeroSection />

          {data.matchFeature.ok ? (
            <MatchFeature {...data.matchFeature.data} />
          ) : (
            <MatchFeatureError />
          )}

          {data.standings.ok ? (
            <StandingsPreview
              seasonLabel="TEMPORADA 2026"
              title="TABLA DE POSICIONES"
              href="/tabla"
              teams={data.standings.data}
            />
          ) : (
            <StandingsPreviewError />
          )}

          {data.mvp.ok ? (
            <MvpLeadersSection mvp={data.mvp.data.featuredMvp} leaders={data.mvp.data.seasonLeaders} />
          ) : (
            <MvpLeadersError />
          )}

          {data.teams.ok ? <TeamsGrid teams={data.teams.data} /> : <TeamsGridError />}

          <HistorySection />
          {data.fixture.ok ? (
            <FixturePreview matches={data.fixture.data} href="/calendario" />
          ) : (
            <FixturePreviewError />
          )}
          <SponsorsSection sponsors={MOCK_SPONSORS} />
          <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
        </PageTransition>
      </main>
    </div>
  );
}
