import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-6 px-4">
      <form
        action={login}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-blue text-sm font-bold text-white">
            SC
          </span>
          <h1 className="text-sm font-semibold tracking-wide">LIGA SC</h1>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Contraseña
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
