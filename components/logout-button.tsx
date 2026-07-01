import { logout } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-muted underline hover:text-foreground"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
