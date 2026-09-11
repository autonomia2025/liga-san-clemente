import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { clubAbrev, clubColor, clubLogoOgPath, clubNombreCorto } from "@/lib/public/display";
import { absoluteUrl } from "@/lib/public/site";

// Imagen que aparece al compartir un partido (WhatsApp, Instagram, X): los dos
// escudos, y el marcador si ya terminó o la fecha y hora si todavía no se
// juega. Se genera por request (force-dynamic) para que el marcador nunca
// quede congelado en "vs" por una versión cacheada de antes del partido.

export const alt = "Partido de la Liga de Básquetbol San Clemente";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Santiago";

const fechaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const horaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Logo como data URI leído del disco; si el archivo no está disponible en el
// entorno de ejecución, cae a la URL pública (el renderizador la descarga).
async function logoSrc(nombreOficial: string): Promise<string | null> {
  const path = clubLogoOgPath(nombreOficial);
  if (!path) return null;
  try {
    const data = await readFile(join(process.cwd(), "public", path));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return absoluteUrl(path);
  }
}

function Escudo({ src, nombreOficial }: { src: string | null; nombreOficial: string }) {
  if (src) {
    return <img src={src} width={210} height={210} style={{ objectFit: "contain" }} alt="" />;
  }
  return (
    <div
      style={{
        width: 210,
        height: 210,
        borderRadius: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(155deg, ${clubColor(nombreOficial)}, #0a0e1a 85%)`,
        fontSize: 64,
        color: "#fff",
      }}
    >
      {clubAbrev(nombreOficial)}
    </div>
  );
}

function Equipo({ src, nombreOficial }: { src: string | null; nombreOficial: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360, gap: 26 }}>
      <Escudo src={src} nombreOficial={nombreOficial} />
      <div
        style={{
          display: "flex",
          fontSize: 46,
          lineHeight: 1,
          color: "#ffffff",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {clubNombreCorto(nombreOficial)}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [anton, partido] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Anton-Regular.ttf")),
    prisma.partido
      .findUnique({
        where: { id },
        select: {
          estado: true,
          fechaHora: true,
          jornada: { select: { numero: true, nombre: true, fecha: true, fase: true } },
          clubLocal: { select: { nombre: true } },
          clubVisitante: { select: { nombre: true } },
          acta: { select: { resultadoLocal: true, resultadoVisitante: true } },
        },
      })
      .catch(() => null),
  ]);

  const fonts = [{ name: "Anton", data: anton, style: "normal" as const, weight: 400 as const }];

  // Partido inexistente o base caída: imagen genérica de la liga en vez de un
  // error (el crawler que la pide no tiene cómo mostrar un 500).
  if (!partido) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0e1a",
            color: "#fff",
            fontFamily: "Anton",
            fontSize: 96,
            textTransform: "uppercase",
          }}
        >
          LBSC 2026
        </div>
      ),
      { ...size, fonts },
    );
  }

  const [logoHome, logoAway] = await Promise.all([
    logoSrc(partido.clubLocal.nombre),
    logoSrc(partido.clubVisitante.nombre),
  ]);

  const esPlayoffs = partido.jornada.fase === "PLAYOFFS";
  const esPlata = esPlayoffs && /plata/i.test(partido.jornada.nombre ?? "");
  // Oro para el cuadro por el título, plata para la Copa de Plata, violeta en
  // fase regular (mismos acentos que el sitio).
  const acento = esPlata ? "#cbd5e1" : esPlayoffs ? "#fbbf24" : "#8b5cf6";
  // rgba explícito: el renderizador de next/og no acepta cualquier sintaxis de
  // color/gradiente del navegador, así que se usa la forma más básica.
  const halo = esPlata ? "rgba(203,213,225,0.16)" : esPlayoffs ? "rgba(251,191,36,0.2)" : "rgba(139,92,246,0.2)";
  const ronda = (partido.jornada.nombre?.trim() || `Fecha ${partido.jornada.numero}`).toUpperCase();

  const finalizado = partido.estado === "FINALIZADO" && partido.acta != null;
  const enVivo = partido.estado === "EN_CURSO";
  const cuando = partido.fechaHora ?? partido.jornada.fecha;
  const local = partido.acta?.resultadoLocal ?? 0;
  const visita = partido.acta?.resultadoVisitante ?? 0;

  let centro: React.ReactNode;
  if (finalizado) {
    centro = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 150, lineHeight: 1 }}>
          <span style={{ color: local > visita ? acento : "#ffffff" }}>{local}</span>
          <span style={{ color: "#4b5563", fontSize: 100 }}>-</span>
          <span style={{ color: visita > local ? acento : "#ffffff" }}>{visita}</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9ca3af", letterSpacing: 6 }}>FINAL</div>
      </div>
    );
  } else {
    const fecha = cuando ? fechaFormatter.format(cuando).toUpperCase() : null;
    const hora = partido.fechaHora ? horaFormatter.format(partido.fechaHora) : null;
    centro = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", fontSize: 120, lineHeight: 1, color: enVivo ? "#ef4444" : "#4b5563" }}>
          {enVivo ? "EN VIVO" : "VS"}
        </div>
        {!enVivo && hora && (
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1, color: acento }}>{hora}</div>
        )}
        {!enVivo && fecha && (
          <div style={{ display: "flex", fontSize: 28, color: "#9ca3af", letterSpacing: 3 }}>{fecha}</div>
        )}
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 56px 40px",
          backgroundColor: "#0a0e1a",
          backgroundImage: `radial-gradient(circle at 50% 0%, ${halo}, rgba(10,14,26,0) 65%)`,
          fontFamily: "Anton",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, letterSpacing: 8 }}>
          <span style={{ color: acento }}>{ronda}</span>
          <span style={{ color: "#4b5563" }}>·</span>
          <span style={{ color: "#9ca3af" }}>LBSC 2026</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Equipo src={logoHome} nombreOficial={partido.clubLocal.nombre} />
          {centro}
          <Equipo src={logoAway} nombreOficial={partido.clubVisitante.nombre} />
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#6b7280", letterSpacing: 5 }}>
          LIGA DE BÁSQUETBOL SAN CLEMENTE · LBSCJMM.CL
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
