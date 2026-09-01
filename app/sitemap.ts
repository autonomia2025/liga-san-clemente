import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/public/site";

// Sitemap dinámico. Antes no existía (daba 404) — sin él, Google no tenía
// forma de descubrir las páginas generadas por datos (/equipo/[slug] y
// /partido/[id]), que son la mayor parte del contenido real del sitio y las
// que más búsquedas long-tail pueden capturar ("resultado JMM vs Pumas", etc).
//
// Se revalida cada hora en vez de generarse una sola vez en build: así los
// partidos nuevos entran al sitemap sin necesidad de un deploy.
export const revalidate = 3600;

// Mismo slugify que team-page-data.ts / playoffs-data.ts — los links de
// /equipo/[slug] se arman a partir del nombre oficial del club, así que el
// sitemap tiene que usar exactamente el mismo criterio o publicaría URLs que
// devuelven 404.
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const RUTAS_ESTATICAS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/en-vivo", priority: 0.9, changeFrequency: "hourly" },
  { path: "/playoffs", priority: 0.9, changeFrequency: "daily" },
  { path: "/tabla", priority: 0.8, changeFrequency: "daily" },
  { path: "/calendario", priority: 0.8, changeFrequency: "daily" },
  { path: "/goleadores", priority: 0.7, changeFrequency: "daily" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const estaticas: MetadataRoute.Sitemap = RUTAS_ESTATICAS.map((r) => ({
    url: new URL(r.path, SITE_URL).toString(),
    lastModified: ahora,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Si la base no responde, el sitemap igual se sirve con las rutas estáticas
  // en vez de romper la request entera — un sitemap parcial es infinitamente
  // mejor que un 500 para el crawler.
  try {
    const [clubes, partidos] = await Promise.all([
      prisma.club.findMany({ select: { nombre: true, updatedAt: true } }),
      prisma.partido.findMany({
        where: { estado: "FINALIZADO" },
        select: { id: true, updatedAt: true },
      }),
    ]);

    const equipos: MetadataRoute.Sitemap = clubes.map((c) => ({
      url: new URL(`/equipo/${slugify(c.nombre)}`, SITE_URL).toString(),
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const detallePartidos: MetadataRoute.Sitemap = partidos.map((p) => ({
      url: new URL(`/partido/${p.id}`, SITE_URL).toString(),
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...estaticas, ...equipos, ...detallePartidos];
  } catch {
    return estaticas;
  }
}
