// URL canónica del sitio público. Vive en un solo lugar porque la usan
// robots.ts, sitemap.ts, el metadataBase del layout y los canonical de cada
// página — si alguna vez cambia el dominio, se cambia acá y nada más.
//
// Sin www no es canónico: lbscjmm.cl responde 308 hacia www.lbscjmm.cl, así
// que el canónico real (y el que se declara en los <link rel="canonical">)
// es el con www.
export const SITE_URL = "https://www.lbscjmm.cl";

export const SITE_NAME = "Liga de Básquetbol San Clemente";

// Helper para armar URLs absolutas en sitemap/JSON-LD sin concatenar strings
// a mano en cada archivo (y sin arriesgar dobles barras).
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
