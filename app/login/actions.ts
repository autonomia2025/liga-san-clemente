"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Email o contraseña incorrectos.")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? await prisma.usuario.findUnique({ where: { supabaseUserId: user.id } })
    : null;

  if (!usuario || !usuario.activo) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "Tu usuario no tiene acceso configurado en Liga SC. Contactá al administrador.",
      )}`,
    );
  }

  redirect(usuario.rol === "ADMIN" ? "/admin" : "/mesa");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
