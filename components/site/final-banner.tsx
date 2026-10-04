import Link from "next/link";
import { CountdownInline } from "@/components/site/countdown-inline";
import { getFinalBannerData, type FinalBannerData } from "@/lib/public/final-banner-data";

// Franja "La Final" debajo del navbar en las páginas públicas (la home no la
// lleva: ahí el hero ya es la portada de la final). Aparece sola en cuanto
// existe la jornada "Final" y cambia con el estado del partido: previa con
// contador, en vivo, y campeón. Si la query falla no se muestra nada — una
// franja promocional nunca puede voltear la página que la contiene.

const YOUTUBE_URL = "https://www.youtube.com/@LigadeBasquetbolSanClemente";

const horaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// "dom, 4 oct, 20:00" → "Dom 4 oct · 20:00"
function cuandoLabel(iso: string): string {
  const partes = horaFormatter.format(new Date(iso)).replace(/\./g, "").split(", ");
  const hora = partes.pop();
  const dia = partes.join(" ");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`;
}

const enlace =
  "shrink-0 font-body text-xs font-bold uppercase tracking-wide underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function Contenido({ data }: { data: FinalBannerData }) {
  if (data.campeon) {
    return (
      <>
        <p className="min-w-0 font-body text-sm text-text-primary">
          <span className="font-head uppercase tracking-tight text-accent-gold">{data.campeon.nombre}, campeón 2026</span>
          <span className="text-text-secondary">
            {" "}
            · Venció {data.campeon.marcador} a {data.campeon.rival} en la final
          </span>
        </p>
        <Link href="/playoffs" className={`${enlace} text-accent-gold`}>
          Ver el camino al título →
        </Link>
      </>
    );
  }

  if (data.estado === "EN_CURSO") {
    return (
      <>
        <p className="flex min-w-0 items-center gap-2 font-body text-sm text-text-primary">
          <span className="lbsc-live-dot h-2 w-2 shrink-0 rounded-full bg-live-pulse" aria-hidden="true" />
          <span className="font-head uppercase tracking-tight text-accent-gold">La Final en vivo</span>
          <span className="truncate text-text-secondary">
            · {data.local} vs {data.visitante}
          </span>
        </p>
        <Link href="/en-vivo" className={`${enlace} text-accent-gold`}>
          Seguir el partido →
        </Link>
      </>
    );
  }

  if (data.estado === "FINALIZADO") return null;

  return (
    <>
      <p className="min-w-0 font-body text-sm text-text-primary">
        <span className="font-head uppercase tracking-tight text-accent-gold">La Final</span>
        <span className="text-text-primary">
          {" "}
          · {data.local} vs {data.visitante}
        </span>
        {data.fechaHora && <span className="text-text-secondary"> · {cuandoLabel(data.fechaHora)}</span>}
        {data.cancha && <span className="hidden text-text-secondary sm:inline"> · {data.cancha}</span>}
        {data.fechaHora && (
          <span className="text-text-secondary">
            {" "}
            · Faltan <span className="font-semibold text-accent-gold"><CountdownInline target={data.fechaHora} /></span>
          </span>
        )}
      </p>
      <span className="flex shrink-0 items-center gap-4">
        <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className={`${enlace} text-text-secondary`}>
          YouTube
        </a>
        <Link href={`/partido/${data.partidoId}`} className={`${enlace} text-accent-gold`}>
          Ver la previa →
        </Link>
      </span>
    </>
  );
}

export async function FinalBanner({ excluirPartidoId }: { excluirPartidoId?: string } = {}) {
  let data: FinalBannerData | null = null;
  try {
    data = await getFinalBannerData();
  } catch {
    return null;
  }
  // En la propia página de la final la franja repetiría lo que ya dice el hero.
  if (!data || data.partidoId === excluirPartidoId) return null;
  if (data.estado === "FINALIZADO" && !data.campeon) return null;

  return (
    <div className="border-b border-accent-gold/25 bg-accent-gold/[0.07]">
      <div className="lbsc-container flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Contenido data={data} />
      </div>
    </div>
  );
}
