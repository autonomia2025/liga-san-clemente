import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Oswald, Inter } from "next/font/google";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/public/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía deportiva de la landing pública (Anton display condensado +
// Oswald para labels/UI). next/font las auto-hostea en build — no hay request
// a Google en runtime. El navegador solo descarga los .woff2 en las páginas
// que realmente las usan (la landing), así Admin/Mesa no cargan estas fuentes.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

// Body/UI del design system nuevo (PR 4.2). Solo agrega la variable --font-inter;
// no cambia el font-family del body global, así Admin/Mesa/landing siguen en
// Geist. El navegador solo baja Inter en las páginas que usan font-body
// (por ahora /design-system).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Metadata global (SEO básico): título con template para que cada página
// pública solo defina su propio título corto y este quede armado como
// "Página | Liga de Básquetbol San Clemente". openGraph/twitter acá son los
// valores por defecto — las páginas que definen su propio openGraph los
// sobreescriben (Next.js hace merge por campo, no reemplaza todo el objeto).
//
// metadataBase ahora sí está definido: el dominio de producción es
// www.lbscjmm.cl (lbscjmm.cl redirige ahí con 308). Sin esto, las URLs de
// og:image quedaban a merced de la inferencia de Next y podían resolver a un
// host equivocado, rompiendo la previsualización al compartir el link en
// WhatsApp/Facebook/X.
//
// OJO: no se define `alternates.canonical` acá a propósito. La metadata se
// hereda por campo hacia abajo, así que un canonical global haría que TODAS
// las páginas se declaren como copia de la home. Cada página define el suyo.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Liga de Básquetbol San Clemente",
    template: "%s | Liga de Básquetbol San Clemente",
  },
  description:
    "Sitio oficial de la Liga de Básquetbol San Clemente: calendario, tabla de posiciones, goleadores, equipos y partidos en vivo de la temporada 2026.",
  openGraph: {
    title: "Liga de Básquetbol San Clemente",
    description:
      "Calendario, tabla de posiciones, goleadores, equipos y partidos en vivo de la Liga de Básquetbol San Clemente.",
    siteName: "Liga de Básquetbol San Clemente",
    locale: "es_CL",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liga de Básquetbol San Clemente",
    description:
      "Calendario, tabla de posiciones, goleadores, equipos y partidos en vivo de la Liga de Básquetbol San Clemente.",
    images: ["/og-image.jpg"],
  },
};

// Datos estructurados (schema.org) de la liga. Le dicen explícitamente a
// Google qué es este sitio — una organización deportiva real, con su nombre,
// deporte, ubicación y redes — en vez de dejar que lo infiera del HTML. Es lo
// que habilita resultados enriquecidos y el panel de conocimiento.
const JSON_LD_ORGANIZACION = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: SITE_NAME,
  alternateName: "LBSC",
  url: SITE_URL,
  logo: absoluteUrl("/logo-liga.png"),
  image: absoluteUrl("/og-image.jpg"),
  sport: "Basketball",
  email: "ligabasketballsanclemente@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Clemente",
    addressRegion: "Maule",
    addressCountry: "CL",
  },
  sameAs: [
    "https://www.instagram.com/lbsc2026/",
    "https://www.youtube.com/@LigadeBasquetbolSanClemente",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${oswald.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          // Contenido estático definido acá arriba (no viene de usuarios ni de
          // la base), así que no hay superficie de inyección.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANIZACION) }}
        />
        {children}
      </body>
    </html>
  );
}
