import type { Metadata } from "next";
import { LbscButton } from "@/components/design-system/lbsc-button";
import { LiveBadge } from "@/components/design-system/live-badge";
import { TeamChip } from "@/components/design-system/team-chip";
import { ScoreNumber } from "@/components/design-system/score-number";

// Laboratorio visual del design system LBSC (PR 4.2). NO es la landing.
// No usa base de datos ni datos reales: todo lo de abajo son valores
// ilustrativos para revisar tokens y componentes. noindex para que no se
// indexe mientras es preview.
export const metadata: Metadata = {
  title: "LBSC · Design System",
  description: "Laboratorio visual — fundación del design system LBSC.",
  robots: { index: false, follow: false },
};

function Swatch({ name, varName, value }: { name: string; varName: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 w-full rounded-lg ring-1 ring-white/10"
        style={{ background: `var(${varName})` }}
      />
      <div>
        <div className="font-body text-xs font-semibold uppercase tracking-wide text-text-primary">{name}</div>
        <div className="font-mono text-[11px] text-text-secondary">{value}</div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lbsc-section-tight border-t border-white/10">
      <h2 className="mb-6 font-head text-2xl uppercase tracking-tight text-text-primary sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-bg-base font-body text-text-primary">
      {/* Encabezado del laboratorio */}
      <header className="lbsc-container flex items-center justify-between py-6">
        <span className="font-head text-2xl uppercase tracking-wide text-text-primary">
          LBSC<span className="text-accent-purple">·</span>Design System
        </span>
        <LiveBadge />
      </header>

      <div className="lbsc-container pb-24">
        <div className="lbsc-fade-up">
          <p className="max-w-2xl font-body text-sm text-text-secondary">
            Fundación visual (PR 4.2). Poster deportivo de básquet amateur, energía de liga local.
            Esta página es solo laboratorio: no es la landing y no usa datos reales.
          </p>
        </div>

        {/* Colores */}
        <Block title="Colores">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch name="BG Base" varName="--bg-base" value="#0A0E1A" />
            <Swatch name="BG Elevated" varName="--bg-elevated" value="#10162A" />
            <Swatch name="Purple" varName="--accent-purple" value="#7C3AED" />
            <Swatch name="Purple Glow" varName="--accent-purple-glow" value="#8B5CF6" />
            <Swatch name="Orange" varName="--accent-orange" value="#F97316" />
            <Swatch name="Gold" varName="--accent-gold" value="#FBBF24" />
            <Swatch name="Blue" varName="--accent-blue" value="#3B82F6" />
            <Swatch name="Live Pulse" varName="--live-pulse" value="#EF4444" />
          </div>
        </Block>

        {/* Tipografía */}
        <Block title="Tipografía">
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-widest text-text-secondary">
                Display — Anton
              </div>
              <div className="font-head text-5xl uppercase leading-none tracking-tight text-text-primary sm:text-7xl">
                Liga de Básquetbol
              </div>
            </div>
            <div>
              <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-widest text-text-secondary">
                Body / UI — Inter
              </div>
              <p className="max-w-xl font-body text-base leading-relaxed text-text-primary">
                Texto de apoyo, navegación, labels y microcopy. Sans grotesca limpia para todo lo
                que no es headline ni número de impacto.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-8">
              <ScoreNumber value={88} label="Local" size="xl" accent="gold" />
              <ScoreNumber value={72} label="Visita" size="xl" />
            </div>
          </div>
        </Block>

        {/* Botones */}
        <Block title="Botones">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <LbscButton variant="primary" size="sm">Primary sm</LbscButton>
              <LbscButton variant="primary" size="md">Primary md</LbscButton>
              <LbscButton variant="primary" size="lg">Primary lg</LbscButton>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <LbscButton variant="secondary" size="sm">Secondary sm</LbscButton>
              <LbscButton variant="secondary" size="md">Secondary md</LbscButton>
              <LbscButton variant="secondary" size="lg">Secondary lg</LbscButton>
            </div>
          </div>
        </Block>

        {/* Badge en vivo */}
        <Block title="Badge en vivo">
          <div className="flex items-center gap-4">
            <LiveBadge />
            <span className="font-body text-sm text-text-secondary">Pulso animado, respeta reduced-motion.</span>
          </div>
        </Block>

        {/* Chips de equipo */}
        <Block title="Chips de equipo">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <TeamChip name="Titanes" abbr="TIT" color="var(--accent-purple)" />
            <TeamChip name="Cóndores" abbr="CND" color="var(--accent-orange)" />
            <TeamChip name="Halcones" abbr="HLC" color="var(--accent-blue)" />
            <TeamChip name="Lobos" abbr="LOB" />
          </div>
        </Block>

        {/* Números scoreboard */}
        <Block title="Números scoreboard">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
            <ScoreNumber value={24} label="MVP pts" size="lg" accent="gold" />
            <ScoreNumber value={12} label="Rebotes" size="md" accent="orange" />
            <ScoreNumber value={"2-0"} label="Serie" size="md" accent="purple" />
            <ScoreNumber value={101} label="Puntos" size="lg" />
          </div>
        </Block>

        {/* Textura / noise */}
        <Block title="Textura y grano">
          <div className="relative h-40 overflow-hidden rounded-xl bg-bg-elevated ring-1 ring-white/10">
            <div className="lbsc-noise" />
            <div className="lbsc-vignette" />
            <div className="relative flex h-full items-center justify-center">
              <span className="font-head text-2xl uppercase tracking-tight text-text-primary">
                .lbsc-noise + .lbsc-vignette
              </span>
            </div>
          </div>
        </Block>

        {/* Tratamiento de foto (placeholder, sin foto real) */}
        <Block title="Bloque con tratamiento de foto">
          <div className="lbsc-photo-treatment relative h-56 rounded-xl ring-1 ring-white/10">
            {/* Placeholder visual: gradiente, NO una foto real ni stock. Cuando
                haya fotos reales entran por acá vía props/CMS. */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, #1b1030, #0a0e1a 60%, #10162a)" }}
            />
            <div className="lbsc-noise" />
            <div className="relative flex h-full flex-col items-start justify-end gap-2 p-6">
              <LiveBadge />
              <span className="font-head text-3xl uppercase leading-none tracking-tight text-text-primary sm:text-4xl">
                Placeholder de foto
              </span>
              <span className="font-body text-xs uppercase tracking-wide text-text-secondary">
                .lbsc-photo-treatment · sin imagen real todavía
              </span>
            </div>
          </div>
        </Block>
      </div>
    </div>
  );
}
