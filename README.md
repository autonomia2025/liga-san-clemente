# Liga SC

Plataforma para reemplazar la planilla física de una liga amateur de básquetbol, con tres experiencias separadas: **Admin**, **Mesa** y **Público**.

Ver el documento de producto y el plan de PRs por fase en la conversación del proyecto (se irá formalizando en `/docs` a medida que avance).

## Estado del proyecto

Fase 0 (Fundaciones) completa y validada contra un proyecto Supabase real (2026-07-01): migraciones, seed, healthcheck, login admin/mesa, bloqueo cruzado de roles y logout, todo verificado end-to-end. Lista para arrancar Fase 1.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + Postgres (pensado para [Supabase](https://supabase.com), pero funciona con cualquier Postgres)
- [Supabase Auth](https://supabase.com/docs/guides/auth) — maneja email/password/sesión. La tabla `Usuario` (Prisma) guarda solo el rol (`ADMIN` / `MESA`) y el estado dentro de la liga.

## Correr el proyecto localmente

Requiere Node.js 20+ y una base de datos Postgres accesible (local o Supabase).

1. Instalar dependencias:

   ```bash
   npm install
   ```

   Esto también genera el cliente de Prisma automáticamente (`postinstall`).

2. Configurar la base de datos:

   ```bash
   cp .env.example .env
   ```

   Completar en `.env`:

   - `DATABASE_URL` — cadena de conexión a tu Postgres.
     - **Supabase**: Project Settings → Database → Connection string.
     - **Postgres local**: `postgresql://usuario:password@localhost:5432/liga_sc?schema=public`.
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API en tu proyecto de Supabase. El proveedor "Email" de Supabase Auth está habilitado por defecto, no requiere configuración adicional para este PR.
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → "service_role" "secret". **Es la key con más privilegios del proyecto** (bypassa RLS, puede crear/borrar usuarios de Auth) — tratala como una contraseña. Nunca lleva el prefijo `NEXT_PUBLIC_`, nunca se expone al cliente, y solo se usa en Server Actions (`lib/supabase/admin.ts`, protegido con el paquete `server-only` para que el build falle si algún día se importa desde un Client Component). Se usa para que Admin pueda crear usuarios de Mesa (`/admin/usuarios-mesa`) sin pasar por el dashboard de Supabase.

3. Aplicar las migraciones (crea las tablas del modelo de datos):

   ```bash
   npx prisma migrate deploy
   ```

   Para desarrollo, si vas a modificar el schema más adelante, usá `npx prisma migrate dev` en su lugar (crea nuevas migraciones a partir de los cambios).

4. Cargar datos mínimos de prueba (seed):

   ```bash
   npm run seed
   ```

   Crea 2 clubes de prueba, algunos jugadores por club, 1 jornada y 1 partido programado. Es seguro correrlo varias veces: usa upsert sobre las claves únicas del schema y no duplica el partido si ya existe. **No son datos reales de la liga** — eso se carga en Fase 1 vía importación.

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

6. Verificar la conexión a la base de datos:

   ```bash
   curl http://localhost:3000/api/health
   ```

   Devuelve `{"status":"ok"}` si la conexión es correcta, o un mensaje de error claro si falta `DATABASE_URL` o la base no es accesible.

## Auth: crear el primer usuario (admin o mesa)

Todavía no existe una UI para gestionar usuarios (eso es PR 1.7 — Fase 1). Hasta entonces, para poder loguearte en `/admin` o `/mesa`, hay que crear el usuario a mano:

1. En el dashboard de Supabase: **Authentication → Users → Add user**. Cargá email y password, y confirmá el email manualmente (o desactivá la confirmación por email en Authentication → Providers → Email mientras estás en desarrollo).
2. Copiá el **User UID** que Supabase le asignó.
3. En el **SQL Editor** de Supabase (o con cualquier cliente Postgres conectado a `DATABASE_URL`), insertá el perfil interno:

   ```sql
   insert into usuarios ("id", "supabaseUserId", "email", "rol", "activo", "createdAt", "updatedAt")
   values ('usr_admin_1', '<User UID de Supabase>', 'admin@ejemplo.com', 'ADMIN', true, now(), now());
   ```

   Usá `'MESA'` en lugar de `'ADMIN'` para crear un usuario de Mesa. El valor de `"id"` puede ser cualquier texto único (no tiene que ser un UUID).

4. Ya podés loguearte en [http://localhost:3000/login](http://localhost:3000/login) con ese email y password. Te redirige a `/admin` o `/mesa` según el rol.

## ✅ Cierre de Fase 0 — validación real (2026-07-01)

Validado end-to-end contra un proyecto Supabase real:

- [x] Aplicar migraciones: `npx prisma migrate deploy`.
- [x] Correr el seed: `npm run seed`.
- [x] Verificar el healthcheck: `curl <url>/api/health` devuelve `{"status":"ok"}`.
- [x] Crear un usuario admin e iniciar sesión en `/login`.
- [x] Confirmar que entra a `/admin` correctamente.
- [x] Confirmar que ese usuario admin **no puede** entrar a `/mesa` (redirige a `/`).
- [x] Crear un usuario mesa e iniciar sesión.
- [x] Confirmar que entra a `/mesa` correctamente.
- [x] Confirmar que ese usuario mesa **no puede** entrar a `/admin` (redirige a `/`).
- [x] Cerrar sesión y confirmar que vuelve a pedir login al intentar entrar a `/admin` o `/mesa`.

Hallazgo adicional durante la validación: RLS (Row Level Security) estaba desactivado en las 10 tablas del schema, lo que dejaba la API REST autogenerada de Supabase (PostgREST) abierta a la `anon key` pública. Se activó RLS sin políticas en las 10 tablas (la app no usa PostgREST, todo pasa por Prisma con la conexión directa, así que no afecta a la app) — bloquea el acceso público por completo. Ver detalle en el historial de la conversación del proyecto.

Nota técnica para el setup local: la conexión **directa** de Supabase (`db.<ref>.supabase.co:5432`) es IPv6-only y puede no ser alcanzable según tu red. Si `prisma migrate deploy` no conecta, usá el **Session pooler** (Project Settings → Database → Connection string → Session pooler, puerto 5432) en `DATABASE_URL` en su lugar — soporta las prepared statements que Prisma necesita para migrar (el Transaction pooler, puerto 6543, no las soporta y cuelga `migrate deploy`).

## Modelo de datos

El schema completo (`prisma/schema.prisma`) vive en `prisma/` y cubre el MVP: usuarios (admin/mesa), clubes, jugadores, jornadas, partidos, roster de partido, eventos del partido (timeline), acta e informe arbitral. No incluye estadísticas no registradas por la Mesa (tiros de campo, rebotes, asistencias, etc.) ni modelado multi-liga.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — sirve el build de producción.
- `npm run lint` — linting.
- `npm run seed` — carga datos mínimos de prueba (ver "Correr el proyecto localmente").

## Deploy

El proyecto está preparado para desplegarse en [Vercel](https://vercel.com) sin configuración adicional (framework detectado automáticamente).

Variables de entorno requeridas en Vercel (Project Settings → Environment Variables):

- `DATABASE_URL` — cadena de conexión a la base de datos de staging/producción.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — del proyecto de Supabase correspondiente a ese entorno.
- `SUPABASE_SERVICE_ROLE_KEY` — marcarla como variable sensible en Vercel (no exponerla en logs de build). Nunca se le agrega el prefijo `NEXT_PUBLIC_`.

El comando `postinstall` (`prisma generate`) corre automáticamente durante el build de Vercel, no requiere pasos manuales adicionales.

Las migraciones (`npx prisma migrate deploy`) **no** corren automáticamente en el build de Vercel — hay que aplicarlas manualmente contra la base de staging/producción (una vez, o cada vez que se agreguen migraciones nuevas) con `DATABASE_URL` apuntando a esa base.
