import type { Metadata } from "next";
import Link from "next/link";
import { TeamChip } from "@/components/design-system/team-chip";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import { clubAbrev, clubColor, clubNombreCorto } from "@/lib/public/display";
import { getStandingsPageData, type StandingsPageRow } from "@/lib/public/standings-page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tabla de posiciones | LBSC 2026",
  description: "Tabla de posiciones completa de la Liga de Básquetbol San Clemente, temporada 2026.",
};

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/#en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Facebook", href: "#" },
];

function diffText(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

/* ---- desktop: tabla completa ---------------------------------------------- */

function DesktopTable({ rows }: { rows: StandingsPageRow[] }) {
  const th = "px-4 py-3 text-left font-body text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary";
  const thNum = `${th} text-right`;
  const td = "px-4 py-4 text-right font-mono text-sm tabular-nums text-text-primary";

  return (
    <table className="hidden w-full border-collapse sm:table">
      <thead>
        <tr className="border-b border-white/10">
          <th className={`${th} w-12`}>#</th>
          <th className={th}>Equipo</th>
          <th className={thNum}>PJ</th>
          <th className={thNum}>PG</th>
          <th className={thNum}>PP</th>
          <th className={thNum}>PF</th>
          <th className={thNum}>PC</th>
          <th className={thNum}>DIF</th>
          <th className={thNum}>PTS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const esLider = r.position === 1;
          return (
            <tr
              key={r.clubId}
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
                <TeamChip
                  name={clubNombreCorto(r.clubNombre)}
                  abbr={clubAbrev(r.clubNombre)}
                  logoUrl={r.escudoUrl}
                  color={clubColor(r.clubNombre)}
                />
              </td>
              <td className={td}>{r.pj}</td>
              <td className={td}>{r.pg}</td>
              <td className={td}>{r.pp}</td>
              <td className={td}>{r.pf}</td>
              <td className={td}>{r.pc}</td>
              <td className={`${td} ${r.dif < 0 ? "text-live-pulse" : "text-text-secondary"}`}>{diffText(r.dif)}</td>
              <td className="px-4 py-4 text-right">
                <span
                  className={`font-head text-xl leading-none tabular-nums ${esLider ? "text-accent-gold" : "text-text-primary"}`}
                >
                  {r.pts}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---- mobile: lista compacta ------------------------------------------------ */

function MobileList({ rows }: { rows: StandingsPageRow[] }) {
  return (
    <ul className="divide-y divide-white/[0.07] sm:hidden">
      {rows.map((r) => {
        const esLider = r.position === 1;
        return (
          <li key={r.clubId} className={`px-4 py-4 ${esLider ? "bg-accent-gold/[0.06]" : ""}`}>
            <div className="flex items-center gap-3">
              <span
                className={`w-7 shrink-0 font-head leading-none tabular-nums ${
                  esLider ? "text-2xl text-accent-gold" : "text-xl text-text-secondary"
                }`}
              >
                {r.position}
              </span>
              <div className="min-w-0 flex-1">
                <TeamChip
                  name={clubNombreCorto(r.clubNombre)}
                  abbr={clubAbrev(r.clubNombre)}
                  logoUrl={r.escudoUrl}
                  color={clubColor(r.clubNombre)}
                />
              </div>
              <span
                className={`shrink-0 font-head text-2xl leading-none tabular-nums ${esLider ? "text-accent-gold" : "text-text-primary"}`}
              >
                {r.pts}
                <span className="ml-1 font-body text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                  pts
                </span>
              </span>
            </div>
            <p className="mt-2 pl-10 font-body text-[11px] uppercase tracking-wide text-text-secondary">
              PJ {r.pj} · {r.pg}-{r.pp} · DIF{" "}
              <span className={r.dif < 0 ? "text-live-pulse" : "text-text-secondary"}>{diffText(r.dif)}</span>
            </p>
            <p className="mt-1 pl-10 font-body text-[11px] uppercase tracking-wide text-text-secondary">
              PF {r.pf} · PC {r.pc}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/* ---- estados ---------------------------------------------------------------- */

function EmptyStandings() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-12 text-center sm:px-8">
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          La tabla aparecerá cuando se registren resultados oficiales.
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

function StandingsError() {
  return (
    <section className="lbsc-container lbsc-section-tight">
      <ModuleError label="la tabla" minHeight="min-h-[260px]" />
    </section>
  );
}

/* ---- página ------------------------------------------------------------------ */

export default async function TablaPage() {
  let rows: StandingsPageRow[] | null = null;
  let failed = false;

  try {
    rows = await getStandingsPageData();
  } catch {
    failed = true;
  }

  const hayDatos = (rows?.some((r) => r.pj > 0) ?? false) && rows !== null;

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={false} />

      <main className="pt-[var(--navbar-height)]">
        <header className="lbsc-container pb-8 pt-14 sm:pt-18 lg:pb-10 lg:pt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-purple">
                Temporada 2026
              </span>
              <h1 className="mt-3 font-head text-6xl uppercase leading-none tracking-tight text-text-primary sm:text-7xl lg:text-8xl">
                Tabla de posiciones
              </h1>
              <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-text-secondary sm:text-base">
                Rendimiento actualizado de los equipos de la Liga de Básquetbol San Clemente.
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
          <StandingsError />
        ) : !rows || !hayDatos ? (
          <EmptyStandings />
        ) : (
          <div className="lbsc-container pb-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-base">
              <DesktopTable rows={rows} />
              <MobileList rows={rows} />
            </div>
            <p className="mt-4 font-body text-[11px] uppercase tracking-wide text-text-secondary">
              PJ: partidos jugados · PG: ganados · PP: perdidos · DIF: diferencia de puntos · PTS: puntos de tabla.
            </p>
          </div>
        )}

        <div className="pb-10" />
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
