import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la service_role key — bypassa RLS y puede administrar
// usuarios de Supabase Auth. SOLO se debe usar en Server Actions o Route
// Handlers, nunca en Client Components. El import de "server-only" hace
// que el build falle si alguna vez se importa este archivo desde código
// de cliente, en vez de filtrar la key silenciosamente al bundle.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Copiá .env.example a .env y completá la service_role key (Project Settings → API).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
