"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { Rol } from "@/generated/prisma/client";

export async function createUsuarioMesa(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/admin/usuarios-mesa?error=${encodeURIComponent(mensaje)}`);

  if (!email) fail("El email no puede estar vacío.");
  if (password.length < 6) fail("La contraseña debe tener al menos 6 caracteres.");

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) fail(`Ya existe un usuario con el email ${email}.`);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    fail(error?.message ?? "No se pudo crear el usuario en Supabase Auth.");
    return;
  }

  try {
    await prisma.usuario.create({
      data: {
        supabaseUserId: data.user.id,
        email,
        rol: Rol.MESA,
        activo: true,
      },
    });
  } catch {
    // No dejar un usuario de Auth huérfano sin perfil en nuestra tabla.
    await admin.auth.admin.deleteUser(data.user.id);
    fail("No se pudo crear el perfil del usuario — se revirtió la creación en Auth.");
    return;
  }

  redirect("/admin/usuarios-mesa?ok=creado");
}

export async function toggleActivoUsuarioMesa(formData: FormData) {
  const usuarioId = String(formData.get("usuarioId") ?? "");

  const fail = (mensaje: string) =>
    redirect(`/admin/usuarios-mesa?error=${encodeURIComponent(mensaje)}`);

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.rol !== Rol.MESA) {
    fail("Usuario de Mesa no encontrado.");
    return;
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo: !usuario.activo },
  });

  redirect("/admin/usuarios-mesa?ok=actualizado");
}
