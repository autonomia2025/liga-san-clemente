import type { Metadata } from "next";
import Link from "next/link";
import { TeamChip } from "@/components/design-system/team-chip";
import { ScoreNumber } from "@/components/design-system/score-number";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import { clubAbrev, clubColor, clubLogoUrl, clubNombreCorto } from "@/lib/public/display";
import { getScoringLeaders, type ScoringLeaderRow } from "@/lib/public/scoring-leaders-page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tabla de goleadores",
  description: "Revisa el ranking de goleadores de la Liga de Básquetbol San Clemente 2026.",
};

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Goleadores", href: "/goleadores" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

// TikTok y Facebook quedan fuera por ahora: sin link oficial confirmado todavía.
const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/lbsc2026/" },
  { label: "YouTube", href: "https://www.youtube.com/@LigadeBasquetbolSanClemente" },
];

/* ---- Top 3 destacados -------------------------------------------------- */

const PODIO_ACCENT: Record<number, "gold" | "orange" | "purple"> = { 1: "gold", 2: "orange", 3: "purple" };
const PODIO_BORDER: Record<number, string> = {
  1: "border-accent-gold/40",
  2: "border-accent-orange/30",
  3: "border-accent-purple/30",
};

function ClubBadge({ clubNombre }: { clubNombre: string }) {
  const logoUrl = clubLogoUrl(clubNombre);
  const style = logoUrl
    ? { background: `rgba(255,255,255,0.05) center/contain no-repeat url(${logoUrl})` }
    : { background: clubColor(clubNombre) };
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-head text-sm uppercase leading-none text-white ring-1 ring-white/10"
      style={style}
    >
      {logoUrl ? "" : clubAbrev(clubNombre)}
    </span>
  );
}

function TopScorerCard({ row }: { row: ScoringLeaderRow }) {
  const esLider = row.position === 1;
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-bg-elevated px-5 py-6 text-center transition-transform duration-200 ${
        PODIO_BORDER[row.position] ?? "border-white/10"
      } ${esLider ? "sm:-translate-y-2 sm:py-8" : ""}`}
    >
      <span
        className={`font-head text-3xl leading-none tabular-nums ${
          esLider ? "text-accent-gold" : row.position === 2 ? "text-accent-orange" : "text-accent-purple"
        }`}
      >
        #{row.position}
      </span>

      <ClubBadge clubNombre={row.clubNombre} />

      <div className="flex flex-col gap-1">
        <span className="font-head text-lg uppercase leading-tight tracking-tight text-text-primary">
          {row.jugadorNombre}
        </span>
        <span className="font-body text-xs uppercase tracking-widest text-text-secondary">
          {clubNombreCorto(row.clubNombre)}
        </span>
      </div>

      <ScoreNumber value={row.puntos} label="PTS" size={esLider ? "lg" : "md"} accent={PODIO_ACCENT[row.position]} />

      <span className="font-body text-[11px] uppercase tracking-widest text-text-secondary">
        {row.promedio.toFixed(1)} PPG · {row.partidosJugados} PJ
      </span>
    </div>
  );
}

function Top3({ rows }: { rows: ScoringLeaderRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="lbsc-container pb-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        {rows.map((r) => (
          <TopScorerCard key={r.jugadorId} row={r} />
        ))}
      </div>
    </div>
  );
}

/* ---- Tabla completa ------------------------------------------------------ */

function DesktopTable({ rows }: { rows: ScoringLeaderRow[] }) {
  const th = "px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary";
  const thNum = `${th} text-right`;
  const td = "px-4 py-4 text-right font-mono text-sm tabular-nums text-text-primary";

  return (
    <table className="hidden w-full border-collapse sm:table">
      <thead>
        <tr className="border-b border-white/10">
          <th className={`${th} w-12`}>#</th>
          <th className={th}>Jugador</th>
          <th className={th}>Equipo</th>
          <th className={thNum}>PJ</th>
          <th className={thNum}>PTS</th>
          <th className={thNum}>PPG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const esLider = r.position === 1;
          return (
            <tr
              key={r.jugadorId}
              className={`border-b border-white/[0.06] last:border-b-0 ${esLider ? "bg-accent-gold/[0.06]" : ""}`}
            >
              <td className="px-4 py-4">
                <span
                  className={`font-head leading-none tabular-nums ${
                    esLider ? "text-2xl text-accent-gold" : "text-xl text-text-secondary"
                  }`}
                >
                  {r.position}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">
                  {r.numeroCamiseta !== null ? `#${r.numeroCamiseta} ` : ""}
                  {r.jugadorNombre}
                </span>
              </td>
              <td className="px-4 py-4">
                <TeamChip
                  name={clubNombreCorto(r.clubNombre)}
                  abbr={clubAbrev(r.clubNombre)}
                  logoUrl={clubLogoUrl(r.clubNombre)}
                  color={clubColor(r.clubNombre)}
                />
              </td>
              <td className={td}>{r.partidosJugados}</td>
              <td className="px-4 py-4 text-right">
                <span
                  className={`font-head text-xl leading-none tabular-nums ${esLider ? "text-accent-gold" : "text-text-primary"}`}
                >
                  {r.puntos}
                </span>
              </td>
              <td className={td}>{r.promedio.toFixed(1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MobileList({ rows }: { rows: ScoringLeaderRow[] }) {
  return (
    <ul className="divide-y divide-white/[0.07] sm:hidden">
      {rows.map((r) => {
        const esLider = r.position === 1;
        return (
          <li key={r.jugadorId} className={`px-4 py-4 ${esLider ? "bg-accent-gold/[0.06]" : ""}`}>
            <div className="flex items-center gap-3">
              <span
                className={`w-7 shrink-0 font-head leading-none tabular-nums ${
                  esLider ? "text-2xl text-accent-gold" : "text-xl text-text-secondary"
                }`}
              >
                {r.position}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-body text-sm font-semibold uppercase tracking-wide text-text-primary">
                  {r.numeroCamiseta !== null ? `#${r.numeroCamiseta} ` : ""}
                  {r.jugadorNombre}
                </span>
                <span className="mt-1 block">
                  <TeamChip
                    name={clubNombreCorto(r.clubNombre)}
                    abbr={clubAbrev(r.clubNombre)}
                    logoUrl={clubLogoUrl(r.clubNombre)}
                    color={clubColor(r.clubNombre)}
                  />
                </span>
              </div>
              <span
                className={`shrink-0 font-head text-2xl leading-none tabular-nums ${esLider ? "text-accent-gold" : "text-text-primary"}`}
              >
                {r.puntos}
                <span className="ml-1 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                  pts
                </span>
              </span>
            </div>
            <p className="mt-2 pl-10 font-body text-[11px] uppercase tracking-wide text-text-secondary">
              PJ {r.partidosJugados} · PPG {r.promedio.toFixed(1)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/* ---- estados ---------------------------------------------------------------- */

function EmptyLeaders() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-12 text-center sm:px-8">
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          Aún no hay estadísticas cargadas.
        </p>
        <Link
          href="/calendario"
          className="mt-6 inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Ver calendario
        </Link>
      </div>
    </section>
  );
}

function LeadersError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="los goleadores" minHeight="min-h-[260px]" />
    </section>
  );
}

/* ---- página ------------------------------------------------------------------ */

export default async function GoleadoresPage() {
  let rows: ScoringLeaderRow[] | null = null;
  let failed = false;

  try {
    rows = await getScoringLeaders();
  } catch {
    failed = true;
  }

  const hayDatos = rows !== null && rows.length > 0;
  const top3 = rows?.slice(0, 3) ?? [];
  const resto = rows ?? [];

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />

      <main className="pt-[var(--navbar-height)]">
        <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pb-10 lg:pt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-gold">
                Temporada 2026
              </span>
              <h1 className="mt-3 font-head text-6xl uppercase leading-none tracking-tight text-text-primary sm:text-7xl lg:text-8xl">
                Goleadores
              </h1>
              <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-text-secondary sm:text-base">
                Ranking de anotación acumulado de la Liga de Básquetbol San Clemente.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex w-fit rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
            >
              Volver al inicio
            </Link>
          </div>
        </header>

        {failed ? (
          <LeadersError />
        ) : !hayDatos ? (
          <EmptyLeaders />
        ) : (
          <>
            <Top3 rows={top3} />
            <div className="lbsc-container pb-6">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-base">
                <DesktopTable rows={resto} />
                <MobileList rows={resto} />
              </div>
              <p className="mt-4 font-body text-[11px] uppercase tracking-wide text-text-secondary">
                PJ: partidos jugados · PTS: puntos totales · PPG: promedio de puntos por partido.
              </p>
            </div>
          </>
        )}

        <div className="pb-10" />
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
