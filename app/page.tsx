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
import { PlayoffsStrip } from "@/components/site/playoffs-strip";
import { SeasonTimeline } from "@/components/site/season-timeline";
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
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LBSC 2026 — Liga de Básquetbol San Clemente | Temporada 2026",
    description:
      "Resultados, calendario, tabla de posiciones y comunidad de la Liga de Básquetbol San Clemente 2026.",
    images: ["/og-image.jpg"],
  },
  alternates: { canonical: "/" },
};

// Historia, auspiciadores y footer siguen con constantes/placeholders por ahora
// (no son dinámicos en este PR). El resto de la Home usa datos reales de DB vía
// getHomePageData(), con estado de error por módulo si una query falla.
// Spalding, Meneagro y MV Nutrition aportan más a la temporada y van
// primero en la franja (tier: "destacado" solo define orden, ver
// sortSponsors en SponsorsSection). El resto (Depore, CCF, Jiko Barber,
// Lever and Murphy Co., NextMove Kinesiología) va después, en el mismo
// orden en que aparecen acá. Logos reales en public/auspiciadores/. Lever
// and Murphy Co. usa lightLogo: true porque su emblema es metálico/plateado
// — se lava sobre la caja clara que usan los demás, así que lleva caja
// oscura en su lugar (ver SponsorLogoBox).
const MOCK_SPONSORS: Sponsor[] = [
  { name: "Spalding", tier: "destacado", label: "Auspiciador Oficial", logoUrl: "/auspiciadores/spalding.png" },
  { name: "Meneagro", tier: "destacado", logoUrl: "/auspiciadores/meneagro.png" },
  { name: "MV Nutrition", tier: "destacado", logoUrl: "/auspiciadores/mv-nutrition.png" },
  { name: "Depore", tier: "support", logoUrl: "/auspiciadores/depore.png" },
  { name: "CCF", tier: "support", logoUrl: "/auspiciadores/ccf.png" },
  { name: "Jiko Barber", tier: "support", logoUrl: "/auspiciadores/jiko-barber.png" },
  { name: "Lever and Murphy Co.", tier: "support", logoUrl: "/auspiciadores/lever-murphy.png", lightLogo: true },
  { name: "NextMove Kinesiología", tier: "support", logoUrl: "/auspiciadores/nextmove-kinesiologia.png" },
];

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

// TikTok y Facebook quedan fuera por ahora: sin link oficial confirmado todavía.
const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/lbsc2026/" },
  { label: "YouTube", href: "https://www.youtube.com/@LigadeBasquetbolSanClemente" },
];

export default async function Home() {
  const data = await getHomePageData();

  // Ambos caen al modo regular si su loader falló: un error en el estado de
  // temporada no puede dejar la home sin hero.
  const modoHero = data.phase.ok ? data.phase.data.modoHome : "regular";
  const playoffs = data.playoffs.ok ? data.playoffs.data : null;

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      {/* Navbar fuera de PageTransition: es fixed y el transform del wrapper le
          rompería el posicionamiento. isLiveNow viene de datos reales. */}
      <Navbar isLiveNow={data.isLiveNow} />

      <main className="pt-[var(--navbar-height)]">
        <PageTransition>
          {/* El modo del hero sale del estado real de la temporada: si hay
              partidos de playoffs cargados cambia solo, sin flags ni fechas
              hardcodeadas. Si el loader de fase falla, cae al modo regular. */}
          <HeroSection mode={modoHero} />

          {/* La franja de playoffs va arriba del módulo de partido: es lo
              primero que tiene que ver alguien que entra a la home. */}
          {playoffs && (
            <PlayoffsStrip
              rondaLabel={playoffs.rondaLabel}
              matches={playoffs.matches}
              proximoAt={playoffs.proximoAt}
            />
          )}

          {data.phase.ok && (
            <SeasonTimeline stages={data.phase.data.stages} championName={playoffs?.championName ?? null} />
          )}

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
