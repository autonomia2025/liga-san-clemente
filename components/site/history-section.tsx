"use client";

import { useEffect, useRef, useState } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";

// Sección Historia / Nosotros de la Home. NO usa base de datos. El copy es
// texto oficial de la liga (editable por props o en las constantes de abajo).
// La foto principal ("Comunidad LBSC") ya es real (public/home/mas-que-una-liga.jpg).
// Las 4 fotos de la galería de abajo siguen siendo placeholder visual (sin
// stock) hasta tener imágenes reales — solo los captions ya son definitivos.

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
  // Acepta un string único o varios párrafos — el texto oficial son 3 frases
  // que se leen mejor como 3 párrafos cortos que como un bloque pegado.
  body?: string | string[];
  milestones?: HistoryMilestone[];
  photos?: HistoryPhoto[];
  closing?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/* ---- copy oficial LBSC (versión final) ------------------------------------
   El texto principal se divide en 3 párrafos cortos (mismo bloque de intro,
   sin agregar secciones nuevas). El cierre usa un texto de invitación propio
   y distinto del texto principal, para no repetir la misma frase dos veces.
--------------------------------------------------------------------------- */

const HISTORY_COPY = [
  "La Liga de Básquetbol San Clemente nace para reunir a los equipos, jugadores y familias que viven el básquetbol con pasión en nuestra comuna y sus alrededores.",
  "Más que una competencia, la LBSC 2026 busca entregar una vitrina seria, ordenada y motivadora al básquetbol amateur, fortaleciendo el respeto, la sana competencia y el sentido de comunidad.",
  "Cada fecha es una oportunidad para crecer, competir y demostrar que en San Clemente el básquetbol se juega con identidad, esfuerzo y corazón.",
];

const HISTORY_MILESTONES: HistoryMilestone[] = [
  { date: "2026", title: "Nace la temporada", description: "Comienza oficialmente la temporada LBSC 2026, con equipos preparados para competir y representar con orgullo a sus clubes." },
  { date: "28 JUN", title: "Primera fecha", description: "San Clemente vivió una primera jornada llena de energía, emoción y grandes partidos en el Polideportivo." },
  { date: "8 EQUIPOS", title: "La liga toma forma", description: "Ocho equipos dan vida a una competencia que crece fecha a fecha, consolidando el básquetbol local y regional." },
  { date: "SPALDING", title: "Auspiciador oficial", description: "Spalding se suma como auspiciador oficial, entregando respaldo y prestigio a una liga que busca seguir elevando su nivel." },
];

const HISTORY_PHOTOS: HistoryPhoto[] = [
  { src: undefined, alt: "Placeholder para foto real de partido LBSC", label: "Intensidad en cancha" },
  { src: undefined, alt: "Placeholder para foto real de equipo en huddle", label: "La familia del básquet" },
  { src: undefined, alt: "Placeholder para foto real del gimnasio", label: "Nuestra casa deportiva" },
  { src: undefined, alt: "Placeholder para foto real de entrenamiento", label: "Preparación y compromiso" },
];

const HISTORY_CLOSING =
  "Equipos, jugadores, familias y amantes del básquetbol: sean parte de la LBSC 2026 y acompañen cada fecha de esta liga que sigue creciendo en San Clemente.";

/* ---- placeholder visual de foto (sin stock) ------------------------------ */

function PhotoPlaceholder({
  photo,
  accent,
  className = "",
  objectPosition = "center",
}: {
  photo: HistoryPhoto;
  accent: string;
  className?: string;
  // Foco del crop cuando hay foto real (background-position) — el
  // placeholder con gradiente no lo necesita, siempre se ve completo.
  objectPosition?: string;
}) {
  return (
    <div className={`lbsc-photo-treatment relative overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`}>
      {photo.src ? (
        <>
          <div
            className="absolute inset-0"
            role="img"
            aria-label={photo.alt}
            style={{ background: `${objectPosition} / cover no-repeat url(${photo.src})` }}
          />
          {/* Tinte sutil del color de acento — mismo lenguaje visual que el
              gradiente morado/naranja/dorado de los placeholders, pero acá
              como wash liviano sobre la foto real (mix-blend-mode: overlay,
              no tapa la imagen) en vez de ser el fondo completo. */}
          <div
            className="absolute inset-0 mix-blend-overlay"
            style={{ background: `linear-gradient(150deg, ${accent}66, transparent 62%)` }}
            aria-hidden="true"
          />
        </>
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
          <div className="flex max-w-[65ch] flex-col gap-4">
            {(Array.isArray(body) ? body : [body]).map((parrafo, i) => (
              <p key={i} className="font-body text-base leading-[1.7] text-text-secondary">
                {parrafo}
              </p>
            ))}
          </div>
        </div>

        {/* Imagen principal — foto real de partido (antes: placeholder con
            gradiente). Aspect ratio pasó de horizontal (4/3 · 5/4) a vertical
            (3/4 · 4/5): la foto original es retrato (1066x1600) y un crop
            horizontal la habría recortado demasiado (cabeza o pies afuera).
            objectPosition prioriza el tercio superior/medio — ahí están
            cabeza, brazos y balón, que es la acción — dejando que el recorte
            se coma más bien las piernas/pies y la marca de agua "©MR.P13" del
            borde inferior (aceptado explícitamente, no se edita la imagen). */}
        <PhotoPlaceholder
          photo={{
            src: "/home/mas-que-una-liga.jpg",
            alt: "Jugador de la Liga de Básquetbol San Clemente lanzando un tiro libre en el Polideportivo, con la banca de suplentes de fondo",
            label: "Comunidad LBSC",
          }}
          accent="#7c3aed"
          objectPosition="center 28%"
          className="aspect-[3/4] w-full lg:aspect-[4/5]"
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
