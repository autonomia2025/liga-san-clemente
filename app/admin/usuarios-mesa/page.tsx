import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { createUsuarioMesa, toggleActivoUsuarioMesa } from "./actions";

export default async function UsuariosMesaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  const usuarios = await prisma.usuario.findMany({
    where: { rol: "MESA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Usuarios de Mesa</h1>
        <p className="text-sm text-muted">{usuarios.length} usuarios con rol Mesa.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok === "creado" && <p className="text-sm text-green-400">Usuario creado.</p>}
      {ok === "actualizado" && <p className="text-sm text-green-400">Usuario actualizado.</p>}

      <form
        action={createUsuarioMesa}
        className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <h2 className="text-lg font-semibold text-foreground">Nuevo usuario de Mesa</h2>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Contraseña inicial
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
          <span className="text-xs text-muted">Mínimo 6 caracteres.</span>
        </label>

        <button
          type="submit"
          className="w-fit rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Crear usuario
        </button>
      </form>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{u.email}</span>
              <span className="text-xs text-muted">
                Creado {new Date(u.createdAt).toLocaleDateString("es-CL")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={u.activo ? "success" : "neutral"}>
                {u.activo ? "Activo" : "Inactivo"}
              </Badge>
              <form action={toggleActivoUsuarioMesa}>
                <input type="hidden" name="usuarioId" value={u.id} />
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  {u.activo ? "Desactivar" : "Reactivar"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {usuarios.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Todavía no hay usuarios de Mesa creados.
          </p>
        )}
      </div>
    </div>
  );
}
