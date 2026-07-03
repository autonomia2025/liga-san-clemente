// Número tipo scoreboard del design system LBSC (PR 4.2).
// Para puntajes, stats y números grandes: display pesado, tabular-nums,
// mucha presencia. Accent gold/orange/purple opcional.

type Accent = "none" | "gold" | "orange" | "purple";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-7xl sm:text-8xl",
};

const ACCENTS: Record<Accent, string> = {
  none: "text-text-primary",
  gold: "text-accent-gold",
  orange: "text-accent-orange",
  purple: "text-accent-purple",
};

export function ScoreNumber({
  value,
  label,
  size = "md",
  accent = "none",
  className = "",
}: {
  value: number | string;
  label?: string;
  size?: Size;
  accent?: Accent;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className={`font-head font-extrabold uppercase leading-none tracking-tight tabular-nums ${SIZES[size]} ${ACCENTS[accent]}`}>
        {value}
      </span>
      {label && (
        <span className="mt-1.5 font-body text-[11px] font-medium uppercase tracking-widest text-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
}
