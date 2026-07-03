import type { ComponentPropsWithoutRef } from "react";

// Botón base del design system LBSC (PR 4.2).
// Nada de glassmorphism: primary sólido púrpura con glow sutil en hover,
// secondary outline sobrio. active:scale leve. Sin librerías.

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-body font-semibold uppercase tracking-wide transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple disabled:pointer-events-none disabled:opacity-50";

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-purple text-white hover:bg-accent-purple-glow hover:shadow-[0_10px_30px_-8px_rgba(139,92,246,0.6)]",
  secondary:
    "border border-white/15 bg-white/[0.02] text-text-primary hover:border-accent-purple/60 hover:bg-accent-purple/10",
};

export function LbscButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
