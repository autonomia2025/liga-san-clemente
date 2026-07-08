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

// Rutas absolutas a propósito: el navbar aparece en todas las páginas
// (/, /calendario, /tabla, /en-vivo, /equipo/[slug]), así que un anchor suelto
// como "#tabla" se rompería fuera de Home (iría a "/en-vivo#tabla", que no
// existe). "Equipos" sigue siendo una sección resumen de Home (no tiene
// página propia todavía), por eso usa "/#equipos".
const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/en-vivo", label: "En Vivo" },
  { href: "/tabla", label: "Tabla" },
  { href: "/goleadores", label: "Goleadores" },
  { href: "/calendario", label: "Calendario" },
  { href: "/#equipos", label: "Equipos" },
];

// Logo oficial de la liga (insignia circular con el nombre ya integrado al
// diseño, PNG transparente). Reemplaza el placeholder SVG anterior.
function Logo() {
  return (
    <img
      src="/logo-liga.png"
      alt="Liga de Básquetbol San Clemente"
      width={1536}
      height={1024}
      className="h-9 w-auto sm:h-10"
    />
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
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-[var(--navbar-height)] transition-all duration-300 ${
          scrolled ? "border-b border-white/10 bg-bg-elevated/90 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="lbsc-container flex h-full items-center justify-between">
          <a href="/" className="flex h-full items-center gap-2.5">
            <Logo />
            <span className="font-head text-xl uppercase tracking-wide text-text-primary">
              LBSC<span className="text-accent-purple">·</span>2026
            </span>
          </a>

          {/* Desktop */}
          <nav className="hidden items-center gap-7 xl:gap-8 2xl:gap-10 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 font-body text-[13px] font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary xl:px-3.5"
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
      </header>

      {/* Mobile: menú fullscreen — hermano de <header>, NO su hijo. Causa raíz
          del hotfix anterior ("no se ve nada"): el panel es `fixed inset-0`,
          y `position: fixed` se posiciona respecto al viewport SALVO que un
          ancestro tenga transform/filter/backdrop-filter/will-change, en
          cuyo caso ese ancestro pasa a ser el "containing block" del fixed.
          El <header>, en estado scrolled, aplica backdrop-blur-xl — así que
          el panel (anidado adentro) quedaba confinado a la caja de 64-88px
          del header en vez de cubrir el viewport completo: si abrías el
          menú después de hacer scroll, todo el contenido (logo, links,
          botón X) quedaba comprimido e invisible en esa franja. Sacarlo del
          <header> como hermano elimina el bug de raíz, sin depender de que
          el header nunca cambie sus estilos. Fondo 100% sólido (sin alpha,
          sin backdrop-blur propio) + texto con color explícito en cada
          elemento (no heredado) por robustez adicional. */}
      {open && (
        <div className="fixed inset-0 z-[80] bg-bg-base text-white lg:hidden">
          <div className="relative z-10 flex min-h-dvh flex-col overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <Logo />
                <span className="font-head text-xl uppercase tracking-wide text-white">
                  LBSC<span className="text-accent-purple">·</span>2026
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="mt-12 flex flex-col gap-5">
              {LINKS.map((l, i) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="lbsc-fade-up flex items-center gap-3 font-head text-3xl uppercase leading-none tracking-tight text-white transition-colors hover:text-accent-purple active:text-accent-purple sm:text-4xl"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {l.label}
                  {l.label === "En Vivo" && isLiveNow && <LiveBadge />}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
