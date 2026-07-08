// Footer de cierre del sitio. Server component (sin hooks): links, contacto y
// redes. Datos por props opcionales o constantes mock claras. No conecta a DB.

export type FooterLink = {
  label: string;
  href: string;
};

export type SocialLink = {
  label: "Instagram" | "TikTok" | "Facebook";
  href: string;
};

export type SiteFooterProps = {
  navLinks?: FooterLink[];
  socialLinks?: SocialLink[];
  contactEmail?: string;
  contactPhone?: string;
};

// Rutas absolutas: SiteFooter se renderiza en todas las páginas públicas, así
// que un anchor suelto se rompería fuera de Home. "Equipos" sigue siendo
// sección resumen de Home (sin página propia todavía).
const DEFAULT_NAV: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

const DEFAULT_SOCIAL: SocialLink[] = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "Facebook", href: "#" },
];

// Contacto oficial de la liga. El email es real y clickeable (mailto). No hay
// número de WhatsApp confirmado todavía — se deja el texto sin link en vez de
// inventar un número.
const CONTACT_EMAIL = "ligabasketballsanclemente@gmail.com";
const CONTACT_PHONE_LABEL = "Inscripciones y consultas por WhatsApp";

function SocialIcon({ label }: { label: SocialLink["label"] }) {
  if (label === "Instagram") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (label === "TikTok") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13.5 3.5v9.8a3.2 3.2 0 1 1-2.6-3.14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.5 3.8c.5 2.2 2 3.7 4.3 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Facebook
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 8.2V6.6c0-.8.3-1.2 1.2-1.2h1.3V2.6h-2.2c-2.3 0-3.3 1.2-3.3 3.3v2.3H9.3v2.9h2.2V21h3V11.1h2.2l.4-2.9h-2.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteFooter({
  navLinks = DEFAULT_NAV,
  socialLinks = DEFAULT_SOCIAL,
  contactEmail = CONTACT_EMAIL,
  contactPhone = CONTACT_PHONE_LABEL,
}: SiteFooterProps) {
  const anio = 2026;
  return (
    <footer className="bg-bg-elevated">
      {/* Banda de transición sutil desde --bg-base para no cortar en seco. */}
      <div className="h-16 bg-gradient-to-b from-bg-base to-bg-elevated" aria-hidden="true" />

      <div className="lbsc-container pb-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Identidad */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-liga.png"
                alt="Liga de Básquetbol San Clemente"
                width={1536}
                height={1024}
                className="h-9 w-auto"
              />
              <span className="font-head text-lg uppercase tracking-wide text-text-primary">
                LBSC<span className="text-accent-purple">·</span>2026
              </span>
            </div>
            <p className="font-body text-sm font-semibold uppercase tracking-wide text-text-primary">
              Liga de Básquetbol San Clemente
            </p>
            <p className="font-body text-xs text-text-secondary">Temporada 2026</p>
            <p className="font-body text-xs text-text-secondary">Polideportivo de San Clemente</p>
          </div>

          {/* Navegación */}
          <nav className="flex flex-col gap-3" aria-label="Navegación del footer">
            <span className="font-body text-[11px] font-bold uppercase tracking-widest text-text-secondary">Navegación</span>
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-body text-sm font-medium uppercase tracking-wide text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Contacto */}
          <div className="flex flex-col gap-3">
            <span className="font-body text-[11px] font-bold uppercase tracking-widest text-text-secondary">Contacto</span>
            <a
              href={`mailto:${contactEmail}`}
              className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
            >
              {contactEmail}
            </a>
            {/* Sin número de WhatsApp confirmado todavía: texto informativo,
                no un link a un número inventado. */}
            <span className="font-body text-sm text-text-secondary">{contactPhone}</span>
            <a
              href="/#contacto"
              className="mt-1 inline-flex w-fit items-center rounded-lg bg-accent-purple px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-accent-purple-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
            >
              Inscribe tu Equipo
            </a>
          </div>

          {/* Redes */}
          <div className="flex flex-col gap-3">
            <span className="font-body text-[11px] font-bold uppercase tracking-widest text-text-secondary">Redes</span>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-text-secondary transition-colors hover:border-accent-purple/50 hover:text-accent-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
                >
                  <SocialIcon label={s.label} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-body text-xs text-text-secondary">© {anio} LBSC. Hecho con pasión en San Clemente.</span>
          <span className="font-body text-xs text-text-secondary">Liga de Básquetbol San Clemente · Temporada 2026</span>
        </div>
      </div>
    </footer>
  );
}
