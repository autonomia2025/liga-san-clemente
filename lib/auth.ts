import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/generated/prisma/client";

// Fuente de verdad de sesión: Supabase Auth.
// Fuente de verdad de rol/estado dentro de la liga: tabla Usuario (Prisma).
export async function getCurrentUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!usuario || !usuario.activo) return null;

  return usuario;
}

// Exige que haya un Usuario activo con el rol indicado.
// Sin sesión -> /login. Sesión válida pero rol distinto -> /.
export async function requireRole(rol: Rol) {
  const usuario = await getCurrentUsuario();

  if (!usuario) redirect("/login");
  if (usuario.rol !== rol) redirect("/");

  return usuario;
}
