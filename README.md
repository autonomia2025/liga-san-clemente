# Liga SC

Plataforma para reemplazar la planilla física de una liga amateur de básquetbol, con tres experiencias separadas: **Admin**, **Mesa** y **Público**.

Ver el documento de producto y el plan de PRs por fase en la conversación del proyecto (se irá formalizando en `/docs` a medida que avance).

## Estado del proyecto

En construcción — Fase 0 (Fundaciones).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + Postgres (pensado para [Supabase](https://supabase.com), pero funciona con cualquier Postgres)
- Autenticación: se incorpora en un PR posterior de Fase 0.

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

   Completar `DATABASE_URL` en `.env` con la cadena de conexión a tu Postgres.

   - **Supabase**: Project Settings → Database → Connection string.
   - **Postgres local**: `postgresql://usuario:password@localhost:5432/liga_sc?schema=public`.

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

4. Verificar la conexión a la base de datos:

   ```bash
   curl http://localhost:3000/api/health
   ```

   Devuelve `{"status":"ok"}` si la conexión es correcta, o un mensaje de error claro si falta `DATABASE_URL` o la base no es accesible.

> Nota: en esta etapa (PR 0.2) todavía no existen tablas de negocio (clubes, jugadores, etc.). El healthcheck solo valida que la app puede comunicarse con la base de datos. El schema completo se incorpora en el PR 0.3.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — sirve el build de producción.
- `npm run lint` — linting.

## Deploy

El proyecto está preparado para desplegarse en [Vercel](https://vercel.com) sin configuración adicional (framework detectado automáticamente).

Variables de entorno requeridas en Vercel (Project Settings → Environment Variables):

- `DATABASE_URL` — cadena de conexión a la base de datos de staging/producción.

El comando `postinstall` (`prisma generate`) corre automáticamente durante el build de Vercel, no requiere pasos manuales adicionales.
