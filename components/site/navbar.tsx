"use client";

import { useEffect, useState } from "react";
import { LbscButton } from "@/components/design-system/lbsc-button";
import { LiveBadge } from "@/components/design-system/live-badge";

// Navegación global LBSC. Client component: detecta scroll (fondo al pasar 80px)
// y maneja el menú fullscreen mobile. isLiveNow por ahora es un mock (ver
// app/page.tsx); más adelante se conectará a getPartidosEnVivo(), no ahora.

type NavbarProps = {
  isLiveNow?: boolean;
};

const LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#en-vivo", label: "En Vivo" },
  { href: "#tabla", label: "Tabla" },
  { href: "#calendario", label: "Calendario" },
  { href: "#equipos", label: "Equipos" },
];

// Logo placeholder: círculo + montaña/águila abstracta. SVG inline, sin imagen
// externa ni stock.
function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" className="text-accent-purple" />
      <path d="M7 22 L13 12 L17 18 L21 10 L25 22 Z" fill="currentColor" className="text-accent-orange" />
      <circle cx="21" cy="9" r="2" fill="currentColor" className="text-accent-gold" />
    </svg>
  );
}

export function Navbar({ isLiveNow = false }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fondo de la navbar al pasar 80px de scroll (listener pasivo + rAF throttle).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Bloquear scroll del body cuando el menú fullscreen está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-white/10 bg-bg-elevated/85 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="lbsc-container flex h-16 items-center justify-between">
        <a href="#inicio" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-head text-xl uppercase tracking-wide text-text-primary">
            LBSC<span className="text-accent-purple">·</span>2026
          </span>
        </a>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 font-body text-[13px] font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            >
              {l.label}
              {l.label === "En Vivo" && isLiveNow && <LiveBadge />}
            </a>
          ))}
        </nav>
        <div className="hidden lg:flex">
          {isLiveNow && <LbscButton size="sm">Ver en Vivo</LbscButton>}
        </div>

        {/* Mobile: hamburguesa */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 lg:hidden"
        >
          <span className="h-0.5 w-5 rounded-full bg-text-primary" />
          <span className="h-0.5 w-5 rounded-full bg-text-primary" />
          <span className="h-0.5 w-5 rounded-full bg-text-primary" />
        </button>
      </div>

      {/* Mobile: menú fullscreen */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-base lg:hidden">
          <div className="lbsc-container flex h-16 items-center justify-between">
            <span className="font-head text-xl uppercase tracking-wide text-text-primary">
              LBSC<span className="text-accent-purple">·</span>2026
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="1.8" className="text-text-primary" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="lbsc-container flex flex-1 flex-col justify-center gap-2">
            {LINKS.map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="lbsc-fade-up flex items-center gap-3 font-head text-5xl uppercase leading-tight tracking-tight text-text-primary"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {l.label}
                {l.label === "En Vivo" && isLiveNow && <LiveBadge />}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
