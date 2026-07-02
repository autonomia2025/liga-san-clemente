const TONE_CLASSES = {
  neutral: "bg-zinc-500/20 text-muted",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  "accent-orange": "bg-accent-orange/20 text-accent-orange",
  "accent-blue": "bg-accent-blue/20 text-accent-blue",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

// Pill de estado reutilizable — un solo lugar para el patrón
// `rounded-full px-2 py-0.5 text-xs` que se repetía a mano en cada
// pantalla con su propia combinación de color.
export function Badge({
  tone = "neutral",
  live = false,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  /** Punto pulsante para estados en vivo (EN_CURSO / EN VIVO). */
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${TONE_CLASSES[tone]} ${className}`}
    >
      {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  );
}
