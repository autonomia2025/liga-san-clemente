import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Oswald, Inter } from "next/font/google";
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
// Sin metadataBase: no hay dominio de producción confirmado todavía (ver
// auditoría SEO), así que las imágenes de acá usan URL relativa a propósito.
export const metadata: Metadata = {
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
        {children}
      </body>
    </html>
  );
}
