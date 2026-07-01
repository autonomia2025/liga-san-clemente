# Liga SC

Plataforma para reemplazar la planilla física de una liga amateur de básquetbol, con tres experiencias separadas: **Admin**, **Mesa** y **Público**.

Ver el documento de producto y el plan de PRs por fase en la conversación del proyecto (se irá formalizando en `/docs` a medida que avance).

## Estado del proyecto

En construcción — Fase 0 (Fundaciones).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- Base de datos y autenticación: se incorporan en PRs posteriores de Fase 0.

## Correr el proyecto localmente

Requiere Node.js 20+.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — sirve el build de producción.
- `npm run lint` — linting.

## Deploy

El proyecto está preparado para desplegarse en [Vercel](https://vercel.com) sin configuración adicional (framework detectado automáticamente).
