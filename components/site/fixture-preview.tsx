"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LiveBadge } from "@/components/design-system/live-badge";

export type FixtureMatch = {
  id: string;
  jornada?: string;
  date: string | Date;
  timeLabel?: string;
  venue?: string;
  status: "scheduled" | "live" | "finished";
  homeTeam: {
    name: string;
    abbr: string;
    logoUrl?: string;
    color?: string;
  };
  awayTeam: {
    name: string;
    abbr: string;
    logoUrl?: string;
    color?: string;
  };
  homeScore?: number | null;
  awayScore?: number | null;
};

export type FixturePreviewProps = {
  matches: FixtureMatch[];
  href?: string;
};

function upper(s: string): string {
  return s.toLocaleUpperCase("es-CL");
}

function matchDate(match: FixtureMatch): Date {
  return new Date(match.date);
}

function dateKey(match: FixtureMatch): string {
  const d = matchDate(match);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(date: Date): string {
  return upper(date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }).replace(".", ""));
}

function formatLongDate(date: Date): string {
  return upper(date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "short" }).replace(".", ""));
}

function formatTime(match: FixtureMatch): string {
  if (match.timeLabel) return match.timeLabel;
  return matchDate(match).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function groupLabel(match: FixtureMatch): string {
  const date = formatLongDate(matchDate(match));
  return match.jornada ? `${upper(match.jornada)} · ${date}` : date;
}

function TeamChip({ team, score }: { team: FixtureMatch["homeTeam"]; score?: number | null }) {
  const shieldStyle: CSSProperties = team.logoUrl
    ? {
        backgroundImage: `url(${team.logoUrl})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }
    : { background: `linear-gradient(155deg, ${team.color ?? "#7c3aed"}, #0a0e1a 82%)` };

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-elevated font-head text-[11px] uppercase leading-none text-white ring-1 ring-white/10"
        style={shieldStyle}
        aria-hidden={team.logoUrl ? true : undefined}
      >
        {team.logoUrl ? "" : team.abbr}
      </span>
      <span className="min-w-0 font-head text-base uppercase leading-none tracking-tight text-text-primary">
        <span className="block truncate sm:hidden">{team.abbr}</span>
        <span className="hidden truncate sm:block">{team.name}</span>
      </span>
      {score != null && (
        <span className="ml-auto font-head text-2xl leading-none tabular-nums text-text-primary sm:ml-1">{score}</span>
      )}
    </span>
  );
}

function StatusBlock({ match }: { match: FixtureMatch }) {
  const hasScore = match.homeScore != null && match.awayScore != null;

  if (match.status === "live") {
    return (
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <LiveBadge />
        <span className="font-head text-xl leading-none tabular-nums text-accent-gold">
          {hasScore ? `${match.homeScore} - ${match.awayScore}` : "EN CURSO"}
        </span>
      </div>
    );
  }

  if (match.status === "finished") {
    return (
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <span className="font-body text-[11px] font-bold uppercase tracking-[0.22em] text-text-secondary">Final</span>
        {hasScore && (
          <span className="font-head text-xl leading-none tabular-nums text-text-primary">
            {match.homeScore} - {match.awayScore}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="font-body text-[11px] font-bold uppercase tracking-[0.22em] text-text-secondary">
      Programado
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-10 text-center sm:px-8">
      <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
        El fixture aparecerá cuando se confirme la próxima fecha.
      </p>
      <a
        href="#tabla"
        className="mt-5 inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
      >
        Ver tabla de posiciones →
      </a>
    </div>
  );
}

export function FixturePreview({ matches, href = "/calendario" }: FixturePreviewProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window) || !sectionRef.current) return;

    setArmed(true);
    const el = sectionRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; matches: FixtureMatch[] }>();
    matches.slice(0, 6).forEach((match) => {
      const key = `${match.jornada ?? "fecha"}-${dateKey(match)}`;
      const group = map.get(key) ?? { label: groupLabel(match), matches: [] };
      group.matches.push(match);
      map.set(key, group);
    });
    return Array.from(map.values());
  }, [matches]);

  const enterClass = armed && !inView ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100";

  return (
    <section id="calendario" ref={sectionRef} className="lbsc-container lbsc-section-tight">
      <div className={`mb-8 flex flex-col gap-5 transition-all duration-500 ease-[var(--lbsc-ease)] ${enterClass} lg:flex-row lg:items-end lg:justify-between`}>
        <div className="max-w-2xl">
          <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-accent-orange">
            Temporada 2026
          </span>
          <h2 className="mt-2 font-head text-4xl uppercase leading-none tracking-tight text-text-primary sm:text-5xl">
            Fixture
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-text-secondary sm:text-base">
            Próximas fechas y partidos de la Liga de Básquetbol San Clemente.
          </p>
        </div>
        <a
          href={href}
          className="inline-flex w-fit rounded-lg border border-white/15 bg-white/[0.02] px-4 py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple sm:text-sm"
        >
          Ver calendario completo →
        </a>
      </div>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg-base">
          {groups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex === 0 ? "" : "border-t border-white/10"}>
              <div className="bg-bg-elevated px-4 py-3 sm:px-5">
                <h3 className="font-body text-[11px] font-bold uppercase tracking-[0.24em] text-accent-orange">
                  {group.label}
                </h3>
              </div>
              <ul className="divide-y divide-white/[0.07]" aria-label={group.label}>
                {group.matches.map((match, i) => {
                  const delay = groupIndex * 120 + i * 50;
                  const rowClass = armed && !inView ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100";
                  return (
                    <li
                      key={match.id}
                      className={`transition-all duration-500 ease-[var(--lbsc-ease)] ${rowClass}`}
                      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
                    >
                      <article className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[112px_1fr_150px] lg:items-center">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-col lg:items-start">
                          <time
                            dateTime={matchDate(match).toISOString()}
                            className="font-head text-2xl uppercase leading-none tabular-nums text-text-primary lg:text-3xl"
                          >
                            {formatTime(match)}
                          </time>
                          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                            {formatShortDate(matchDate(match))}
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
                          <TeamChip team={match.homeTeam} score={match.status === "finished" ? match.homeScore : undefined} />
                          <span className="px-1 text-center font-body text-[11px] font-bold uppercase tracking-[0.24em] text-text-secondary">
                            vs
                          </span>
                          <TeamChip team={match.awayTeam} score={match.status === "finished" ? match.awayScore : undefined} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                          {match.venue && (
                            <span className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary lg:hidden">
                              {match.venue}
                            </span>
                          )}
                          <StatusBlock match={match} />
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
