"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function updateClub(formData: FormData) {
  const clubId = String(formData.get("clubId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const escudoUrlRaw = String(formData.get("escudoUrl") ?? "").trim();
  const escudoUrl = escudoUrlRaw.length > 0 ? escudoUrlRaw : null;

  if (!nombre) {
    redirect(`/admin/clubes/${clubId}?error=${encodeURIComponent("El nombre no puede estar vacío.")}`);
  }

  try {
    await prisma.club.update({
      where: { id: clubId },
      data: { nombre, escudoUrl },
    });
  } catch (error) {
    const isDuplicateName =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    redirect(
      `/admin/clubes/${clubId}?error=${encodeURIComponent(
        isDuplicateName
          ? `Ya existe otro club con el nombre "${nombre}".`
          : "No se pudo guardar el club.",
      )}`,
    );
  }

  redirect(`/admin/clubes/${clubId}?ok=1`);
}
