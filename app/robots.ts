import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public/site";

// robots.txt generado por Next. Antes no existía (daba 404), así que los
// buscadores no tenían ninguna guía ni referencia al sitemap.
//
// Se bloquean las zonas privadas/internas (Admin, Mesa, login, API y la
// página de design system), que no aportan nada en resultados de búsqueda y
// solo diluyen el crawl budget. Todo el sitio público queda permitido.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/mesa", "/login", "/api", "/design-system"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
