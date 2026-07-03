"use client";

import { useEffect, useRef, useState } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";

// Sección Historia / Nosotros de la Home. NO usa base de datos. El copy y las
// fotos son placeholders claramente marcados para reemplazar por texto/fotos
// reales más adelante (por props o editando las constantes de abajo).

export type HistoryMilestone = {
  date: string;
  title: string;
  description: string;
};

export type HistoryPhoto = {
  src?: string;
  alt: string;
  label?: string;
};

export type HistorySectionProps = {
  kicker?: string;
  titleLineOne?: string;
  titleLineTwo?: string;
  highlightedWord?: string;
  body?: string;
  milestones?: HistoryMilestone[];
  photos?: HistoryPhoto[];
  closing?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/* ---- copy real de la liga -------------------------------------------------
   El texto base (3 frases) se reparte en los dos slots narrativos que ya
   existen en el layout, sin agregar bloques nuevos:
   - body: primera + segunda frase (intro narrativa, ya pensada para 3-4
     líneas con max-w-[65ch]).
   - closing: tercera frase (llamada comunitaria, justo antes del CTA).
--------------------------------------------------------------------------- */

const HISTORY_COPY =
  "La Liga de Básquetbol San Clemente nace para reunir a los equipos, jugadores y familias que viven el básquetbol con pasión en nuestra comuna y sus alrededores. Más que una competencia, la LBSC 2026 busca entregar una vitrina seria, ordenada y motivadora al básquetbol amateur, fortaleciendo el respeto, la sana competencia y el sentido de comunidad.";

// Descripciones cortas y neutras — solo datos ya confirmados en el resto del
// sitio (8 equipos, Spalding como auspiciador oficial). Sin fechas de
// fundación ni resultados que no estén confirmados.
const HISTORY_MILESTONES: HistoryMilestone[] = [
  { date: "2026", title: "Nace la temporada", description: "La temporada 2026 reúne a ocho equipos en una competencia pensada para ordenar, visibilizar y fortalecer el básquetbol amateur local." },
  { date: "28 JUN", title: "Primera fecha", description: "La primera fecha marcó el inicio oficial de la competencia en las canchas de San Clemente." },
  { date: "8 EQUIPOS", title: "La liga toma forma", description: "Ocho clubes confirmaron su participación y le dieron forma al calendario de la temporada." },
  { date: "SPALDING", title: "Auspiciador oficial", description: "Spalding se sumó como auspiciador oficial, aportando respaldo y visibilidad a cada fecha de la competencia." },
];

const HISTORY_PHOTOS: HistoryPhoto[] = [
  { src: undefined, alt: "Placeholder para foto real de partido LBSC", label: "[PLACEHOLDER: Partido]" },
  { src: undefined, alt: "Placeholder para foto real de equipo en huddle", label: "[PLACEHOLDER: Comunidad]" },
  { src: undefined, alt: "Placeholder para foto real del gimnasio", label: "[PLACEHOLDER: Polideportivo]" },
  { src: undefined, alt: "Placeholder para foto real de entrenamiento", label: "[PLACEHOLDER: Entrenamiento]" },
];

const HISTORY_CLOSING =
  "Cada fecha es una oportunidad para crecer, competir y demostrar que en San Clemente el básquetbol se juega con identidad, esfuerzo y corazón.";

/* ---- placeholder visual de foto (sin stock) ------------------------------ */

function PhotoPlaceholder({ photo, accent, className = "" }: { photo: HistoryPhoto; accent: string; className?: string }) {
  return (
    <div className={`lbsc-photo-treatment relative overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`}>
      {photo.src ? (
        <div
          className="absolute inset-0"
          role="img"
          aria-label={photo.alt}
          style={{ background: `center/cover no-repeat url(${photo.src})` }}
        />
      ) : (
        <div className="absolute inset-0" role="img" aria-label={photo.alt} style={{ background: `linear-gradient(150deg, ${accent}, #0a0e1a 82%)` }}>
          {/* Líneas de cancha muy tenues */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
            <circle cx="150" cy="200" r="52" stroke="#fff" strokeWidth="2" />
            <line x1="0" y1="200" x2="300" y2="200" stroke="#fff" strokeWidth="2" />
            <path d="M95 40 A55 55 0 0 1 205 40" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
      )}
      <div className="lbsc-noise" />
      <div className="lbsc-vignette" />
      {photo.label && (
        <span className="absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {photo.label}
        </span>
      )}
    </div>
  );
}

/* ---- timeline ------------------------------------------------------------ */

function Timeline({ milestones }: { milestones: HistoryMilestone[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window) || !ref.current) return;
    setArmed(true);
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const lineState = `${armed ? "lbsc-tl-line--armed" : ""} ${inView ? "lbsc-tl-line--in" : ""}`;
  const dotState = `${armed ? "lbsc-tl-dot--armed" : ""} ${inView ? "lbsc-tl-dot--in" : ""}`;

  return (
    <div ref={ref} className="relative mt-14">
      {/* Línea conectora: vertical en mobile, horizontal en desktop. */}
      <span className={`lbsc-tl-line-v absolute top-2 bottom-2 left-[7px] w-0.5 bg-bg-elevated lg:hidden ${lineState}`} aria-hidden="true" />
      <span className={`lbsc-tl-line-h absolute left-0 right-0 top-[7px] hidden h-0.5 bg-bg-elevated lg:block ${lineState}`} aria-hidden="true" />

      <ol className="flex flex-col gap-8 lg:flex-row lg:gap-0">
        {milestones.map((m, i) => (
          <li key={`${m.date}-${i}`} className="relative pl-8 lg:flex-1 lg:px-4 lg:pl-0 lg:pt-8">
            <span
              className={`lbsc-tl-dot absolute h-3.5 w-3.5 rounded-full bg-accent-gold ring-4 ring-bg-base left-0 top-0.5 lg:left-4 lg:top-0 ${dotState}`}
              style={{ ["--tl-delay" as string]: `${i * 160}ms` } as React.CSSProperties}
              aria-hidden="true"
            />
            <span className="font-head text-lg uppercase leading-none tracking-tight text-accent-gold">{m.date}</span>
            <h3 className="mt-1.5 font-body text-base font-semibold uppercase tracking-wide text-text-primary">{m.title}</h3>
            <p className="mt-1.5 max-w-xs font-body text-sm leading-relaxed text-text-secondary">{m.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---- sección ------------------------------------------------------------- */

export function HistorySection({
  kicker = "NUESTRA HISTORIA",
  titleLineOne = "Más que una",
  titleLineTwo = "Liga.",
  highlightedWord = "Liga",
  body = HISTORY_COPY,
  milestones = HISTORY_MILESTONES,
  photos = HISTORY_PHOTOS,
  closing = HISTORY_CLOSING,
  ctaLabel = "Súmate a la Liga →",
  ctaHref = "#contacto",
}: HistorySectionProps) {
  // Resalta highlightedWord dentro de la segunda línea del título.
  const renderTitleTwo = () => {
    if (!highlightedWord || !titleLineTwo.includes(highlightedWord)) {
      return titleLineTwo;
    }
    const [before, after] = titleLineTwo.split(highlightedWord);
    return (
      <>
        {before}
        <span className="text-accent-orange">{highlightedWord}</span>
        {after}
      </>
    );
  };

  return (
    <section id="historia" className="lbsc-anchor lbsc-container lbsc-section-tight">
      {/* Intro narrativa asimétrica */}
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="flex flex-col gap-5">
          <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-purple">{kicker}</span>
          <h2 className="font-head text-5xl uppercase leading-[0.9] tracking-tight text-text-primary sm:text-6xl">
            {titleLineOne}
            <br />
            {renderTitleTwo()}
          </h2>
          <p className="max-w-[65ch] font-body text-base leading-[1.7] text-text-secondary">{body}</p>
        </div>

        {/* Imagen principal (placeholder ligeramente dominante) */}
        <PhotoPlaceholder
          photo={{ src: undefined, alt: "Placeholder para foto real de la Liga de Básquetbol San Clemente", label: "[PLACEHOLDER: Comunidad LBSC]" }}
          accent="#7c3aed"
          className="aspect-[4/3] w-full lg:aspect-[5/4]"
        />
      </div>

      {/* Timeline de hitos */}
      <Timeline milestones={milestones} />

      {/* Galería de fotos: masonry en desktop, scroll-snap en mobile */}
      <div className="lbsc-no-scrollbar mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto lg:block lg:snap-none lg:overflow-visible lg:[column-count:4] lg:[column-gap:1rem]">
        {photos.map((p, i) => {
          const accents = ["#7c3aed", "#f97316", "#fbbf24", "#3b82f6"];
          // Alturas variadas para sensación editorial (masonry en desktop).
          const aspect = i % 2 === 0 ? "aspect-[3/4]" : "aspect-[4/5]";
          return (
            <PhotoPlaceholder
              key={`${p.alt}-${i}`}
              photo={p}
              accent={accents[i % accents.length]}
              className={`min-w-[72%] shrink-0 snap-center lg:mb-4 lg:min-w-0 lg:break-inside-avoid ${aspect}`}
            />
          );
        })}
      </div>

      {/* Cierre + CTA */}
      <div className="mt-14 flex flex-col items-start gap-5 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl font-body text-lg leading-[1.6] text-text-primary">{closing}</p>
        <LbscButton
          variant="secondary"
          size="lg"
          className="shrink-0"
          onClick={() => document.getElementById(ctaHref.replace(/^#/, ""))?.scrollIntoView({ behavior: "smooth" })}
        >
          {ctaLabel}
        </LbscButton>
      </div>
    </section>
  );
}
