// Transición de entrada de página: fade + translateY(8px), 300ms, una vez al
// montar (carga inicial o cambio de ruta). Es CSS puro (.lbsc-page-enter en
// globals.css) y respeta prefers-reduced-motion, así que no necesita JS ni
// librerías.
//
// IMPORTANTE: no debe envolver la Navbar. La Navbar es position:fixed y este
// wrapper aplica un `transform`, lo que crea un containing block y rompería el
// posicionamiento fixed. Por eso en la Home la Navbar queda fuera de
// PageTransition y solo se envuelve el contenido principal + footer.
//
// La salida entre rutas no se implementa: App Router no permite una animación
// de salida real sin la View Transitions API, que no forzamos en esta preview.
// Fallback: transición de entrada limpia (la salida es un corte estándar).
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="lbsc-page-enter">{children}</div>;
}
