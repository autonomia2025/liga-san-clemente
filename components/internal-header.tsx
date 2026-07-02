import { LogoutButton } from "@/components/logout-button";

const ACCENT_CLASSES = {
  "accent-blue": "bg-accent-blue",
  "accent-orange": "bg-accent-orange",
} as const;

// Header compartido por los layouts internos (Admin/Mesa) — antes cada
// layout repetía a mano la marca "SC" + label + email + logout con
// tamaños/colores levemente distintos. Se parametriza por acento para no
// perder la distinción visual Admin (azul) / Mesa (naranja). El mapa fijo
// (en vez de interpolar la clase) es a propósito: Tailwind necesita ver la
// clase completa en el código para generarla.
//
// `showBrand` se apaga en Admin: ahí la marca "SC" ya vive en el sidebar,
// y repetirla acá arriba duplicaría el logo en la misma pantalla.
export function InternalHeader({
  label,
  accent,
  userEmail,
  showBrand = true,
}: {
  label: string;
  accent: keyof typeof ACCENT_CLASSES;
  userEmail: string;
  showBrand?: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      {showBrand ? (
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-md ${ACCENT_CLASSES[accent]} text-sm font-bold text-white`}
          >
            SC
          </span>
          <span className="text-sm font-semibold tracking-wide">{label}</span>
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted">{userEmail}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
