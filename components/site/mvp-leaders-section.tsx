"use client";

import { useEffect, useRef, useState } from "react";
import { TeamChip } from "@/components/design-system/team-chip";

// Módulo "MVP destacado + líderes de temporada". Preparado para recibir datos
// por props; por ahora se alimenta con mocks desde app/page.tsx (NO conectado a
// DB). Lenguaje visual tipo gráfica deportiva de Instagram, pero nativo web.

export type TeamRef = {
  name: string;
  abbr: string;
  logoUrl?: string;
  color?: string;
};

export type MvpMatchResult = {
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number;
  awayScore: number;
};

export type FeaturedMvp = {
  playerName: string;
  playerInitials: string;
  playerPhotoUrl?: string;
  teamName: string;
  teamAbbr: string;
  teamAccentColor: string;
  points: number;
  matchResult: MvpMatchResult;
};

export type SeasonLeader = {
  category: string;
  playerName: string;
  playerInitials: string;
  playerPhotoUrl?: string;
  teamName: string;
  teamAbbr: string;
  teamAccentColor: string;
  value: number;
  suffix?: string;
};

export type MvpLeadersSectionProps = {
  // Opcional: si todavía no hay MVP registrado en un acta, se muestra un empty
  // state calmado en vez de inventar un jugador.
  mvp?: FeaturedMvp;
  leaders: SeasonLeader[];
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduce;
}

/* ---- foto / placeholder del jugador -------------------------------------- */

function PlayerPhoto({
  photoUrl,
  initials,
  accent,
  armed,
  inView,
  innerRef,
}: {
  photoUrl?: string;
  initials: string;
  accent: string;
  armed: boolean;
  inView: boolean;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-l-4 ring-1 ring-white/10 sm:aspect-auto sm:h-full sm:min-h-[420px]"
      style={{ borderColor: accent }}
    >
      <div className={`lbsc-mvp-photo absolute inset-0 ${armed ? "lbsc-mvp-photo--armed" : ""} ${inView ? "lbsc-mvp-photo--in" : ""}`}>
        {/* Inner ligeramente sobredimensionado para que el cursor-follow (max
            8px) nunca revele bordes. */}
        <div ref={innerRef} className="absolute -inset-4 will-change-transform">
          {photoUrl ? (
            <div
              className="absolute inset-0"
              aria-label={`Foto de ${initials}`}
              role="img"
              style={{ background: `center/cover no-repeat url(${photoUrl})` }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-label={`Jugador ${initials}`}
              role="img"
              style={{ background: `linear-gradient(155deg, ${accent}, #0a0e1a 78%)` }}
            >
              <span className="font-head text-[26vw] uppercase leading-none text-white/85 sm:text-[12rem]">
                {initials}
              </span>
            </div>
          )}
        </div>
        {/* Tratamiento poster: grano + viñeta + oscurecido inferior. */}
        <div className="lbsc-noise" />
        <div className="lbsc-vignette" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(10,14,26,0.75) 100%)" }} />
      </div>
    </div>
  );
}

/* ---- feature principal --------------------------------------------------- */

function FeaturedMvpCard({ mvp, reduce }: { mvp: FeaturedMvp; reduce: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoInnerRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);

  // Entrada por viewport (arma la animación de la foto y dispara el count-up).
  useEffect(() => {
    if (reduce) {
      setInView(true);
      setCount(mvp.points);
      return;
    }
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      setCount(mvp.points);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [reduce, mvp.points]);

  // Count-up del número de puntos.
  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    let start: number | null = null;
    const dur = 1100;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * mvp.points));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, mvp.points]);

  // Cursor-follow de la foto (solo desktop con hover, no reduced-motion).
  useEffect(() => {
    if (reduce) return;
    const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const root = rootRef.current;
    const inner = photoInnerRef.current;
    if (!hoverable || !root || !inner) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      target.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 8;
      target.y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 8;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      inner.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px)`;
      raf = requestAnimationFrame(loop);
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  const { matchResult: mr } = mvp;

  return (
    <div
      ref={rootRef}
      className="grid grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-bg-elevated transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] lg:grid-cols-[0.9fr_1.1fr]"
    >
      {/* Foto (arriba en mobile como banda, izquierda en desktop) */}
      <div className="p-4 sm:p-5 lg:p-6">
        <PlayerPhoto
          photoUrl={mvp.playerPhotoUrl}
          initials={mvp.playerInitials}
          accent={mvp.teamAccentColor}
          armed={armed}
          inView={inView}
          innerRef={photoInnerRef}
        />
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
        <span
          className="font-body text-xs font-bold uppercase tracking-[0.22em]"
          style={{ color: mvp.teamAccentColor }}
        >
          MVP · {mvp.teamName}
        </span>

        <div className="flex items-end gap-4">
          <span
            className="font-head text-8xl uppercase leading-[0.8] tabular-nums sm:text-9xl"
            style={{ color: mvp.teamAccentColor }}
          >
            {count}
          </span>
          <span className="mb-2 font-body text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Puntos
          </span>
        </div>

        <div className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
          {mvp.playerName}
        </div>

        {/* Resultado del partido */}
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-text-secondary">
          <TeamChip name={mr.homeTeam.name} abbr={mr.homeTeam.abbr} logoUrl={mr.homeTeam.logoUrl} color={mr.homeTeam.color} />
          <span className="font-mono text-lg font-extrabold tabular-nums text-text-primary">
            {mr.homeScore} <span className="text-text-secondary">-</span> {mr.awayScore}
          </span>
          <TeamChip name={mr.awayTeam.name} abbr={mr.awayTeam.abbr} logoUrl={mr.awayTeam.logoUrl} color={mr.awayTeam.color} />
        </div>
      </div>
    </div>
  );
}

/* ---- líderes de temporada ------------------------------------------------ */

function SeasonLeaders({ leaders }: { leaders: SeasonLeader[] }) {
  return (
    <ul
      className="lbsc-no-scrollbar mt-8 flex snap-x snap-mandatory gap-0 overflow-x-auto sm:mt-10 sm:grid sm:snap-none sm:overflow-visible"
      style={{ gridTemplateColumns: `repeat(${Math.min(leaders.length, 4)}, minmax(0, 1fr))` }}
    >
      {leaders.map((l, i) => (
        <li
          key={`${l.category}-${i}`}
          className={`flex min-w-[78%] shrink-0 snap-center flex-col gap-3 px-2 py-4 sm:min-w-0 sm:px-6 ${i > 0 ? "sm:border-l sm:border-white/10" : ""}`}
        >
          <span className="font-body text-[11px] font-bold uppercase tracking-widest text-text-secondary">
            {l.category}
          </span>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-head text-sm uppercase leading-none text-white ring-1 ring-white/10"
              style={{
                background: l.playerPhotoUrl
                  ? `center/cover no-repeat url(${l.playerPhotoUrl})`
                  : `linear-gradient(155deg, ${l.teamAccentColor}, #0a0e1a)`,
              }}
              aria-label={l.playerPhotoUrl ? undefined : `Jugador ${l.playerInitials}`}
              role={l.playerPhotoUrl ? "img" : undefined}
            >
              {l.playerPhotoUrl ? "" : l.playerInitials}
            </span>
            <div className="min-w-0">
              <div className="truncate font-body text-sm font-semibold uppercase tracking-wide text-text-primary">
                {l.playerName}
              </div>
              <div className="truncate font-body text-[11px] uppercase tracking-wide text-text-secondary">
                {l.teamName}
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-head text-4xl uppercase leading-none tabular-nums" style={{ color: l.teamAccentColor }}>
              {l.value}
            </span>
            {l.suffix && (
              <span className="font-body text-xs font-semibold uppercase tracking-widest text-text-secondary">{l.suffix}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---- sección ------------------------------------------------------------- */

function EmptyMvp() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-bg-elevated p-8 text-center">
      <span className="font-head text-2xl uppercase tracking-tight text-text-primary">MVP del último partido</span>
      <p className="max-w-md font-body text-sm text-text-secondary">
        El MVP del último partido aparecerá cuando el acta esté confirmada.
      </p>
    </div>
  );
}

export function MvpLeadersSection({ mvp, leaders }: MvpLeadersSectionProps) {
  const reduce = usePrefersReducedMotion();
  return (
    <section id="mvp" className="lbsc-container lbsc-section-tight">
      <div className="mb-6 flex flex-col gap-2">
        <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-purple">Figuras</span>
        <h2 className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
          MVP del partido
        </h2>
      </div>

      {mvp ? <FeaturedMvpCard mvp={mvp} reduce={reduce} /> : <EmptyMvp />}

      {leaders.length > 0 ? (
        <SeasonLeaders leaders={leaders} />
      ) : (
        <p className="mt-8 font-body text-sm text-text-secondary">Los líderes de temporada aparecerán a medida que se registren estadísticas.</p>
      )}
    </section>
  );
}
