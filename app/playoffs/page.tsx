import type { Metadata } from "next";
import Link from "next/link";
import { ModuleError } from "@/components/site/module-error";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter, type FooterLink, type SocialLink } from "@/components/site/site-footer";
import {
  getPlayoffsData,
  type CopaPlataData,
  type PlayoffEtapa,
  type PlayoffMatchup,
  type PlayoffsData,
  type PlayoffTeam,
} from "@/lib/public/playoffs-data";
import { clubLogoPad } from "@/lib/public/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Playoffs",
  description:
    "Bracket de los playoffs de la Liga de Básquetbol San Clemente: cuartos de final, semifinales, la final por el título 2026 y la Copa de Plata.",
  alternates: { canonical: "/playoffs" },
};

const TIME_ZONE = "America/Santiago";

const FOOTER_NAV_LINKS: FooterLink[] = [
  { label: "Inicio", href: "/" },
  { label: "En Vivo", href: "/en-vivo" },
  { label: "Tabla", href: "/tabla" },
  { label: "Calendario", href: "/calendario" },
  { label: "Equipos", href: "/#equipos" },
];

const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/lbsc2026/" },
  { label: "YouTube", href: "https://www.youtube.com/@LigadeBasquetbolSanClemente" },
];

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const horaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const diaFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

// Clave YYYY-MM-DD del día en Chile, para agrupar partidos por jornada real.
const diaKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Acento = "oro" | "plata";

function fechaLabel(value: Date | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return dateFormatter.format(d).toLocaleUpperCase("es-CL").replace(/\./g, "");
}

/* ---- piezas ------------------------------------------------------------------ */

const METALES: Record<Acento, [string, string, string]> = {
  oro: ["#fde68a", "#fbbf24", "#b45309"],
  plata: ["#f8fafc", "#cbd5e1", "#64748b"],
};

function Trofeo({ className = "", metal = "oro" }: { className?: string; metal?: Acento }) {
  const [claro, medio, oscuro] = METALES[metal];
  const relleno = `url(#trofeo-${metal})`;
  return (
    <svg
      viewBox="0 0 64 72"
      className={className}
      role="img"
      aria-label={metal === "oro" ? "Trofeo de campeón" : "Trofeo de la Copa de Plata"}
    >
      <defs>
        <linearGradient id={`trofeo-${metal}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={claro} />
          <stop offset="45%" stopColor={medio} />
          <stop offset="100%" stopColor={oscuro} />
        </linearGradient>
      </defs>
      {/* asas */}
      <path
        d="M18 12H10a10 10 0 0 0 10 10M46 12h8a10 10 0 0 1-10 10"
        stroke={relleno}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* copa */}
      <path d="M18 6h28v18c0 8.5-6.3 15-14 15s-14-6.5-14-15V6Z" fill={relleno} />
      {/* brillo */}
      <path d="M23 10h4v14c0 3 .6 5.6 1.8 7.6C25 30.2 23 27 23 24V10Z" fill="#fff" opacity="0.28" />
      {/* tallo y base */}
      <rect x="29" y="38" width="6" height="12" fill={relleno} />
      <rect x="20" y="50" width="24" height="5" rx="1.5" fill={relleno} />
      <rect x="15" y="57" width="34" height="7" rx="2.5" fill={relleno} />
    </svg>
  );
}

function Escudo({ team, size = 28 }: { team: PlayoffTeam; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg font-head uppercase leading-none text-white ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: size <= 30 ? 9 : 12,
        ...(team.logoUrl
          ? {
              backgroundColor: "rgba(255,255,255,0.05)",
              backgroundImage: `url(${team.logoUrl})`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundOrigin: "content-box",
              padding: `${clubLogoPad(team.abbr, 4)}px`,
            }
          : { background: `linear-gradient(155deg, ${team.color}, #0a0e1a 82%)` }),
      }}
      aria-hidden={team.logoUrl ? true : undefined}
    >
      {team.logoUrl ? "" : team.abbr}
    </span>
  );
}

// Una de las dos filas de una llave. `estado` controla el tratamiento visual:
// el ganador se ilumina en dorado, el perdedor se atenúa, y una plaza sin
// definir se dibuja como placeholder — nunca con un equipo inventado.
function FilaEquipo({
  team,
  score,
  estado,
  acento = "oro",
}: {
  team: PlayoffTeam | null;
  score: number | null;
  estado: "ganador" | "perdedor" | "neutro";
  acento?: Acento;
}) {
  const colorGanador = acento === "plata" ? "text-accent-silver" : "text-accent-gold";
  if (!team) {
    return (
      <div className="flex h-1/2 items-center gap-2.5 px-3">
        <span className="h-7 w-7 shrink-0 rounded-lg border border-dashed border-white/15" aria-hidden="true" />
        <span className="font-body text-xs uppercase tracking-wide text-text-secondary/70">Por definir</span>
      </div>
    );
  }

  const ganador = estado === "ganador";
  const perdedor = estado === "perdedor";

  return (
    <div className={`flex h-1/2 items-center gap-2.5 px-3 ${perdedor ? "opacity-45" : ""}`}>
      <span
        className={`w-4 shrink-0 text-center font-mono text-[10px] tabular-nums ${ganador ? colorGanador : "text-text-secondary"}`}
      >
        {team.seed}
      </span>
      <Escudo team={team} size={28} />
      <span
        className={`min-w-0 flex-1 truncate font-head text-sm uppercase leading-none tracking-tight ${ganador ? colorGanador : "text-text-primary"}`}
      >
        {team.name}
      </span>
      {score != null && (
        <span
          className={`shrink-0 font-head text-lg leading-none tabular-nums ${ganador ? colorGanador : "text-text-primary"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function estadoDe(matchup: PlayoffMatchup, team: PlayoffTeam | null): "ganador" | "perdedor" | "neutro" {
  if (!team || !matchup.winner) return "neutro";
  return matchup.winner.clubId === team.clubId ? "ganador" : "perdedor";
}

function LlaveCard({
  matchup,
  destacada = false,
  acento = "oro",
}: {
  matchup: PlayoffMatchup;
  destacada?: boolean;
  acento?: Acento;
}) {
  const fecha = fechaLabel(matchup.scheduledAt);
  const decidida = matchup.winner != null;

  const contenido = (
    <div
      className={`relative flex h-full flex-col justify-center overflow-hidden rounded-xl border bg-bg-elevated transition-colors ${
        destacada
          ? acento === "plata"
            ? "border-accent-silver/35 shadow-[0_0_24px_-10px_rgba(203,213,225,0.45)]"
            : "border-accent-gold/40 shadow-[0_0_28px_-10px_rgba(251,191,36,0.5)]"
          : decidida
            ? "border-white/12"
            : "border-white/10"
      } ${matchup.partidoId ? "hover:border-accent-purple/60" : ""}`}
    >
      {matchup.status === "live" && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-live-pulse/15 px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wider text-live-pulse">
          <span className="h-1 w-1 animate-pulse rounded-full bg-live-pulse" aria-hidden="true" />
          Vivo
        </span>
      )}
      <FilaEquipo team={matchup.home} score={matchup.homeScore} estado={estadoDe(matchup, matchup.home)} acento={acento} />
      <div className="mx-3 border-t border-white/[0.07]" aria-hidden="true" />
      <FilaEquipo team={matchup.away} score={matchup.awayScore} estado={estadoDe(matchup, matchup.away)} acento={acento} />
    </div>
  );

  // Altura fija (h-24) pase lo que pase: los conectores del bracket desktop
  // se alinean con el centro de cada tarjeta, así que la fecha va posicionada
  // por fuera del flujo (top-full) para no empujar el alto y descalzar las
  // líneas cuando los partidos tengan horario asignado.
  return (
    <div className="relative h-24">
      {matchup.partidoId ? (
        <Link
          href={`/partido/${matchup.partidoId}`}
          className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          {contenido}
        </Link>
      ) : (
        contenido
      )}
      {fecha && matchup.status !== "finished" && (
        <span className="absolute left-1 top-full mt-1 whitespace-nowrap font-body text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          {fecha}
        </span>
      )}
    </div>
  );
}

// Conector en "⊐" que une las dos llaves de una mitad con la ronda siguiente.
// Solo desktop: en mobile el bracket se apila verticalmente y las líneas
// dejan de aportar (ver BracketMobile).
function Conector({ lado }: { lado: "izquierda" | "derecha" }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {lado === "izquierda" ? (
        <>
          <div className="h-36 w-6 rounded-r-lg border-y border-r border-white/15" />
          <div className="w-6 border-t border-white/15" />
        </>
      ) : (
        <>
          <div className="w-6 border-t border-white/15" />
          <div className="h-36 w-6 rounded-l-lg border-y border-l border-white/15" />
        </>
      )}
    </div>
  );
}

function LineaHorizontal({ ancho = "w-10" }: { ancho?: string }) {
  return <div className={`${ancho} border-t border-white/15`} aria-hidden="true" />;
}

function TituloRonda({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-body text-[10px] font-bold uppercase tracking-[0.28em] text-text-secondary ${className}`}>
      {children}
    </h2>
  );
}

function CampeonBloque({ champion, metal = "oro" }: { champion: PlayoffTeam | null; metal?: Acento }) {
  const oro = metal === "oro";
  const halo = oro
    ? champion
      ? "rgba(251,191,36,0.35)"
      : "rgba(251,191,36,0.12)"
    : champion
      ? "rgba(203,213,225,0.28)"
      : "rgba(203,213,225,0.08)";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: halo }}
          aria-hidden="true"
        />
        <Trofeo metal={metal} className={`relative ${oro ? "h-16 w-16" : "h-12 w-12"} ${champion ? "" : "opacity-35"}`} />
      </div>
      {champion ? (
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`font-body text-[10px] font-bold uppercase tracking-[0.28em] ${oro ? "text-accent-gold" : "text-accent-silver"}`}
          >
            {oro ? "Campeón 2026" : "Campeón Copa de Plata"}
          </span>
          <Link
            href={`/equipo/${champion.slug}`}
            className={`font-head uppercase leading-none tracking-tight text-text-primary transition-colors ${
              oro ? "text-2xl hover:text-accent-gold" : "text-xl hover:text-accent-silver"
            }`}
          >
            {champion.name}
          </Link>
        </div>
      ) : (
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.28em] text-text-secondary/70">
          {oro ? "Campeón por definir" : "Por definir"}
        </span>
      )}
    </div>
  );
}

/* ---- bracket desktop --------------------------------------------------------- */

function BracketDesktop({ data }: { data: PlayoffsData }) {
  const [qf1, qf2, qf3, qf4] = data.quarterfinals;
  const [sf1, sf2] = data.semifinals;

  // Anchos ajustados para que el bracket completo (1152px) entre en una
  // pantalla de 1280px con el padding del contenedor — que es justo donde se
  // activa el breakpoint xl. overflow-x-auto queda igual como red de
  // seguridad: si alguna vez crece, scrollea dentro de su caja en vez de
  // romper el ancho de la página.
  return (
    <div className="hidden overflow-x-auto pb-2 xl:block">
      <div className="flex min-w-max items-center justify-center">
        {/* llave izquierda */}
        <div className="flex w-48 flex-col gap-12">
          <LlaveCard matchup={qf1} />
          <LlaveCard matchup={qf2} />
        </div>
        <Conector lado="izquierda" />
        <div className="w-48">
          <LlaveCard matchup={sf1} />
        </div>
        <LineaHorizontal ancho="w-8" />

        {/* centro: final + trofeo */}
        <div className="flex w-56 flex-col items-center gap-5 px-2">
          <CampeonBloque champion={data.champion} />
          <div className="w-full">
            <LlaveCard matchup={data.final} destacada />
          </div>
        </div>

        <LineaHorizontal ancho="w-8" />
        <div className="w-48">
          <LlaveCard matchup={sf2} />
        </div>
        <Conector lado="derecha" />
        <div className="flex w-48 flex-col gap-12">
          <LlaveCard matchup={qf3} />
          <LlaveCard matchup={qf4} />
        </div>
      </div>
    </div>
  );
}

/* ---- bracket mobile / tablet -------------------------------------------------- */

function RondaMobile({ titulo, matchups }: { titulo: string; matchups: PlayoffMatchup[] }) {
  return (
    <section className="flex flex-col gap-3">
      <TituloRonda className="text-center">{titulo}</TituloRonda>
      {/* gap-y amplio: la fecha de cada llave se posiciona fuera del flujo
          (ver LlaveCard), así que necesita aire debajo para no encimarse con
          la tarjeta siguiente. */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-7 sm:grid-cols-2">
        {matchups.map((m) => (
          <LlaveCard key={m.key} matchup={m} destacada={m.round === "final"} />
        ))}
      </div>
    </section>
  );
}

function FlechaAbajo() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <svg viewBox="0 0 16 20" className="h-5 w-4 text-white/20">
        <path d="M8 0v14M3 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function BracketMobile({ data }: { data: PlayoffsData }) {
  return (
    <div className="flex flex-col gap-2 xl:hidden">
      <RondaMobile titulo="Cuartos de Final" matchups={data.quarterfinals} />
      <FlechaAbajo />
      <RondaMobile titulo="Semifinales" matchups={data.semifinals} />
      <FlechaAbajo />
      <section className="flex flex-col items-center gap-4">
        <CampeonBloque champion={data.champion} />
        <div className="w-full max-w-sm">
          <TituloRonda className="mb-2 text-center">Final</TituloRonda>
          <LlaveCard matchup={data.final} destacada />
        </div>
      </section>
    </div>
  );
}

/* ---- secciones ---------------------------------------------------------------- */

function TercerLugar({ matchup }: { matchup: PlayoffMatchup }) {
  return (
    <section className="mt-14 flex flex-col items-center gap-3">
      <TituloRonda>Partido por el 3er lugar</TituloRonda>
      <div className="w-full max-w-sm">
        <LlaveCard matchup={matchup} />
      </div>
    </section>
  );
}

function Siembra({ seeds }: { seeds: PlayoffTeam[] }) {
  if (seeds.length === 0) return null;
  return (
    <section className="mt-16">
      <TituloRonda className="mb-4">Siembra · Fase regular</TituloRonda>
      <ol className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
        {seeds.map((s) => (
          <li key={s.clubId}>
            <Link
              href={`/equipo/${s.slug}`}
              className="flex items-center gap-3 rounded-lg border-t border-white/[0.07] py-2.5 pl-1 pr-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className="w-5 shrink-0 text-center font-head text-base leading-none tabular-nums text-accent-gold">
                {s.seed}
              </span>
              <Escudo team={s} size={26} />
              <span className="min-w-0 flex-1 truncate font-body text-sm text-text-primary">{s.name}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Copa de Plata: los eliminados en cuartos. Va debajo del cuadro principal,
// más chica y en plateado — tiene su final y su campeón, pero no le disputa
// protagonismo al título.
function CopaPlataSeccion({ copa }: { copa: CopaPlataData }) {
  const [sf1, sf2] = copa.semifinals;
  const hayCruces = [sf1, sf2].some((m) => m.home || m.away);
  if (!hayCruces) return null;

  return (
    <section
      aria-labelledby="copa-plata-titulo"
      className="mt-20 rounded-2xl border border-accent-silver/15 bg-[linear-gradient(180deg,rgba(203,213,225,0.05),transparent_65%)] px-5 py-10 sm:px-8"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-body text-[10px] font-bold uppercase tracking-[0.28em] text-accent-silver/80">
          Los eliminados en cuartos siguen compitiendo
        </span>
        <h2
          id="copa-plata-titulo"
          className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl"
        >
          Copa de Plata
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 items-center gap-x-8 gap-y-10 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-2">
          <TituloRonda className="text-center md:text-left">Semifinal</TituloRonda>
          <LlaveCard matchup={sf1} acento="plata" />
        </div>
        <div className="order-last flex flex-col items-center gap-4 md:order-none md:w-56">
          <CampeonBloque champion={copa.champion} metal="plata" />
          <div className="w-full">
            <TituloRonda className="mb-2 text-center">Final</TituloRonda>
            <LlaveCard matchup={copa.final} destacada acento="plata" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <TituloRonda className="text-center md:text-right">Semifinal</TituloRonda>
          <LlaveCard matchup={sf2} acento="plata" />
        </div>
      </div>
    </section>
  );
}

// Programación del próximo día de partidos: todo lo que se juega esa fecha
// (título y Copa de Plata) en orden de horario, con lo ya terminado incluido
// para que el día se lea completo.
function ProgramacionDia({ data }: { data: PlayoffsData }) {
  const todas = [
    ...data.quarterfinals,
    ...data.semifinals,
    data.thirdPlace,
    data.final,
    ...data.copaPlata.semifinals,
    data.copaPlata.final,
  ].filter((m) => m.partidoId && m.scheduledAt);

  const pendientes = todas
    .filter((m) => m.status !== "finished")
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  if (pendientes.length === 0) return null;

  const dia = diaKeyFormatter.format(new Date(pendientes[0].scheduledAt!));
  const delDia = todas
    .filter((m) => diaKeyFormatter.format(new Date(m.scheduledAt!)) === dia)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const diaTexto = diaFormatter.format(new Date(pendientes[0].scheduledAt!)).replace(",", "");

  return (
    <section aria-labelledby="programacion-titulo" className="mb-16">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <TituloRonda>Próxima jornada</TituloRonda>
        <p id="programacion-titulo" className="font-head text-2xl uppercase leading-none tracking-tight text-text-primary sm:text-3xl">
          {diaTexto}
        </p>
      </div>
      <ol className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {delDia.map((m) => {
          const plata = m.key.startsWith("plata");
          const conMarcador = m.status !== "scheduled" && m.homeScore != null && m.awayScore != null;
          const fila = (team: PlayoffTeam | null, score: number | null) => {
            const perdio = m.winner != null && team != null && m.winner.clubId !== team.clubId;
            return (
              <div className={`flex items-center gap-2 ${perdio ? "opacity-45" : ""}`}>
                {team ? (
                  <Escudo team={team} size={24} />
                ) : (
                  <span className="h-6 w-6 rounded-md border border-dashed border-white/15" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate font-head text-sm uppercase leading-none tracking-tight text-text-primary">
                  {team?.name ?? "Por definir"}
                </span>
                {conMarcador && (
                  <span className="shrink-0 font-head text-base leading-none tabular-nums text-text-primary">{score}</span>
                )}
              </div>
            );
          };
          return (
            <li key={m.key}>
              <Link
                href={m.status === "live" ? "/en-vivo" : `/partido/${m.partidoId}`}
                className={`flex h-full flex-col gap-2.5 rounded-xl border px-4 py-3 transition-colors ${
                  plata
                    ? "border-white/10 bg-white/[0.02] hover:border-accent-silver/40"
                    : "border-accent-gold/25 bg-accent-gold/[0.04] hover:border-accent-gold/55"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-head text-xl leading-none tabular-nums text-text-primary">
                    {m.status === "live" ? (
                      <span className="text-live-pulse">En vivo</span>
                    ) : m.status === "finished" ? (
                      <span className="text-text-secondary">Final</span>
                    ) : (
                      horaFormatter.format(new Date(m.scheduledAt!))
                    )}
                  </span>
                  <span
                    className={`font-body text-[10px] font-bold uppercase tracking-[0.18em] ${plata ? "text-accent-silver/80" : "text-accent-gold"}`}
                  >
                    {plata ? "Copa de Plata" : m.label}
                  </span>
                </div>
                {fila(m.home, m.homeScore)}
                {fila(m.away, m.awayScore)}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Copy del encabezado según la ronda en la que está el cuadro.
const HERO_ETAPA: Record<PlayoffEtapa | "sin-partidos", { kicker: string; bajada: string }> = {
  "sin-partidos": { kicker: "Temporada 2026", bajada: "Ocho equipos. Tres rondas. Un solo campeón." },
  cuartos: { kicker: "Temporada 2026 · Cuartos de Final", bajada: "Ocho equipos. Tres rondas. Un solo campeón." },
  semis: { kicker: "Temporada 2026 · Semifinales", bajada: "Quedan cuatro. Dos partidos, dos pasajes a la final." },
  final: { kicker: "Temporada 2026 · La Final", bajada: "Quedan dos. Un partido. Un solo campeón." },
  campeon: { kicker: "Temporada 2026 · Campeón", bajada: "La temporada 2026 ya tiene dueño." },
};

// Los que siguen con chance por el título, para los escudos del encabezado.
function equiposEnCarrera(data: PlayoffsData): PlayoffTeam[] {
  const equipos =
    data.etapa === "final"
      ? [data.final.home, data.final.away]
      : data.etapa === "semis"
        ? data.semifinals.flatMap((m) => [m.home, m.away])
        : [];
  return equipos.filter((t): t is PlayoffTeam => t !== null).sort((a, b) => a.seed - b.seed);
}

function PlayoffsError() {
  return (
    <section className="lbsc-container pb-16">
      <ModuleError label="los playoffs" minHeight="min-h-[260px]" />
    </section>
  );
}

function SinClasificados() {
  return (
    <section className="lbsc-container pb-16">
      <div className="rounded-2xl border border-white/10 bg-bg-elevated px-5 py-14 text-center sm:px-8">
        <p className="mx-auto max-w-md font-body text-sm leading-relaxed text-text-secondary">
          El bracket de playoffs aparecerá cuando la fase regular defina a los clasificados.
        </p>
        <Link
          href="/tabla"
          className="mt-6 inline-flex rounded-lg border border-white/15 bg-white/[0.02] px-5 py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent-purple/60 hover:bg-accent-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          Ver tabla
        </Link>
      </div>
    </section>
  );
}

/* ---- página -------------------------------------------------------------------- */

export default async function PlayoffsPage() {
  let data: PlayoffsData | null = null;
  let failed = false;

  try {
    data = await getPlayoffsData();
  } catch {
    failed = true;
  }

  const hayLlaveEnVivo =
    data != null &&
    [
      ...data.quarterfinals,
      ...data.semifinals,
      data.thirdPlace,
      data.final,
      ...data.copaPlata.semifinals,
      data.copaPlata.final,
    ].some((m) => m.status === "live");

  const heroCopy = HERO_ETAPA[data?.etapa ?? "sin-partidos"];
  const enCarrera = data ? equiposEnCarrera(data) : [];

  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      <Navbar isLiveNow={hayLlaveEnVivo} />

      <main className="pt-[var(--navbar-height)]">
        {/* hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(251,191,36,0.16), transparent 70%), radial-gradient(ellipse 50% 50% at 50% 100%, rgba(124,58,237,0.14), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="lbsc-noise" aria-hidden="true" />
          <div className="lbsc-container relative flex flex-col items-center gap-4 py-14 text-center sm:py-18 lg:py-20">
            <span className="font-body text-xs font-bold uppercase tracking-[0.28em] text-accent-gold">
              {heroCopy.kicker}
            </span>
            <h1 className="font-head text-6xl uppercase leading-[0.85] tracking-tight text-text-primary sm:text-7xl lg:text-8xl">
              Playoffs
            </h1>
            <p className="max-w-md font-body text-sm leading-relaxed text-text-secondary sm:text-base">
              {heroCopy.bajada}
            </p>
            {enCarrera.length > 0 && (
              <ul className="mt-3 flex flex-wrap justify-center gap-4" aria-label="Equipos que siguen en carrera">
                {enCarrera.map((t) => (
                  <li key={t.clubId}>
                    <Link
                      href={`/equipo/${t.slug}`}
                      className="flex w-20 flex-col items-center gap-2 transition-opacity hover:opacity-80"
                    >
                      <Escudo team={t} size={56} />
                      <span className="w-full truncate text-center font-body text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                        {t.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data && !data.seedingDefinitiva && (
              <p className="mt-1 rounded-full border border-accent-orange/30 bg-accent-orange/10 px-3.5 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-accent-orange">
                Siembra provisoria · faltan partidos de fase regular
              </p>
            )}
          </div>
        </section>

        {failed || !data ? (
          <div className="pt-12">
            <PlayoffsError />
          </div>
        ) : data.seeds.length < 8 ? (
          <div className="pt-12">
            <SinClasificados />
          </div>
        ) : (
          <div className="lbsc-container pb-20 pt-12 sm:pt-16">
            <ProgramacionDia data={data} />
            <BracketDesktop data={data} />
            <BracketMobile data={data} />
            <TercerLugar matchup={data.thirdPlace} />
            <CopaPlataSeccion copa={data.copaPlata} />
            <Siembra seeds={data.seeds} />
          </div>
        )}
      </main>

      <SiteFooter navLinks={FOOTER_NAV_LINKS} socialLinks={FOOTER_SOCIAL_LINKS} />
    </div>
  );
}
