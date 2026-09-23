# cruboldocs — BC SaaS Fabric

Producto: Aplicacion SaaS. Responsable: Fernando Bolívar. Idioma: español latinoamericano neutro.

## Stack fijo
Next.js (App Router) + TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + RLS) · Stripe · Vercel · GitHub.

## Cómo se trabaja
- El estado del proyecto vive en `docs/ESTADO.md`. Léelo al iniciar cualquier tarea; actualízalo al terminarla. El historial del chat NO es la memoria del proyecto.
- El desarrollo avanza por fases con `/fase <nombre>` (una fase por sesión; Fernando limpia contexto entre fases). Fases: arquitectura, diseno, frontend, backend, seguridad, testing, contenido, deploy.
- Paradas obligatorias para aprobación de Fernando: alcance del MVP, mockup de diseño, auditoría de seguridad antes del deploy.

## Reglas invariables
- Sin secretos en código ni commits: `.env.local` y variables de Vercel.
- Toda tabla con RLS activo y política por `organization_id`. Todo cambio de esquema por migración en `supabase/migrations/`.
- Sin dependencias nuevas sin justificación de una línea.
- Decisiones de arquitectura, costos o seguridad: preguntar a Fernando, no asumir.
- Commits pequeños en español. Respuestas directas, sin relleno; resumen de 3 líneas al cerrar cada fase.

