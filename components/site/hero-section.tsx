"use client";

import { useEffect, useRef } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";

// Hero de la Home. Entrada on-load con stagger (CSS .lbsc-fade-up). Imagen
// placeholder con tratamiento del design system (sin foto real/stock).
// Parallax leve SOLO en desktop y solo si no hay reduced-motion.

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function HeroSection() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    if (reduce || !desktop || !parallaxRef.current) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY * 0.15, 30); // máximo 30px
        if (parallaxRef.current) parallaxRef.current.style.transform = `translateY(${y}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="inicio"
      className="relative flex min-h-[85vh] items-center overflow-hidden pt-8 lg:grid lg:min-h-screen lg:grid-cols-[55%_45%] lg:items-stretch lg:pt-14"
    >
      {/* Imagen / bloque visual (fondo en mobile, columna derecha en desktop) */}
      <div className="absolute inset-0 lg:relative lg:col-start-2">
        <div ref={parallaxRef} className="h-full w-full will-change-transform">
          <div className="lbsc-image-settle lbsc-photo-treatment h-full min-h-[85vh] w-full lg:min-h-full lg:scale-105 lg:[transform-origin:center]">
            {/* Placeholder: gradientes duros + court abstracto. NO foto real. */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #241245 0%, #0a0e1a 55%, #10162a 100%)" }} />
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(60% 50% at 75% 25%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(50% 45% at 20% 90%, rgba(249,115,22,0.28), transparent 60%)",
              }}
            />
            {/* Court abstracto: arcos y línea central en trazo fino. */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.13]" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
              <circle cx="200" cy="300" r="70" stroke="#ffffff" strokeWidth="2" />
              <line x1="0" y1="300" x2="400" y2="300" stroke="#ffffff" strokeWidth="2" />
              <path d="M120 60 A120 120 0 0 1 280 60" stroke="#ffffff" strokeWidth="2" />
              <path d="M120 540 A120 120 0 0 0 280 540" stroke="#ffffff" strokeWidth="2" />
            </svg>
            <div className="lbsc-noise" />
            <div className="lbsc-vignette" />
            {/* Overlay más oscuro en mobile para legibilidad del texto encima. */}
            <div className="absolute inset-0 bg-bg-base/70 lg:bg-transparent" />
          </div>
        </div>
      </div>

      {/* Texto / identidad */}
      <div className="lbsc-container relative z-10 flex flex-col items-start gap-6 pb-28 pt-20 lg:col-start-1 lg:row-start-1 lg:max-w-2xl lg:pb-0 lg:pt-0">
        <span
          className="lbsc-fade-up font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-orange"
          style={{ animationDelay: "0ms" }}
        >
          Temporada 2026
        </span>

        <h1
          className="lbsc-fade-up font-head text-6xl uppercase leading-[0.9] tracking-tight text-text-primary sm:text-7xl lg:text-8xl"
          style={{ animationDelay: "100ms" }}
        >
          Somos Liga.
          <br />
          Somos <span className="text-accent-purple">Liga</span>
        </h1>

        <p
          className="lbsc-fade-up max-w-md font-body text-base leading-relaxed text-text-secondary sm:text-lg"
          style={{ animationDelay: "200ms" }}
        >
          8 equipos. Una sola pasión. La liga de básquetbol amateur que está transformando San
          Clemente.
        </p>

        <div
          className="lbsc-fade-up flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <LbscButton size="lg" className="w-full sm:w-auto" onClick={() => scrollToId("calendario")}>
            Ver Calendario
          </LbscButton>
          <LbscButton
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => scrollToId("historia")}
          >
            Conoce la Liga
          </LbscButton>
        </div>
      </div>
    </section>
  );
}
