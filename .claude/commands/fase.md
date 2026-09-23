---
description: Ejecuta una fase del pipeline (diseno | frontend | backend | seguridad | testing | contenido | deploy)
---

Fase solicitada: $ARGUMENTS

Protocolo de toda fase: (1) lee `docs/ESTADO.md` y `docs/ARQUITECTURA.md` — NO pidas contexto que ya esté ahí; (2) ejecuta solo esta fase con su skill; (3) actualiza ESTADO.md; (4) cierra con resumen de 3 líneas + la fase siguiente, recordando limpiar contexto. No avances a otra fase.

Roles por fase:
- **diseno** — Diseñador de producto. Skill `disenador-ui`. Tokens + spec + mockup HTML estático obligatorio. DETENTE en el mockup: Fernando aprueba antes de frontend. Producto propio → ofrecer preset Hex Core.
- **frontend** — Dev frontend. Skill `frontend-saas`. `design/tokens.md` y specs son contrato; por pantalla: layout → componentes → estados → responsive. Sin `any`, sin tocar BD.
- **backend** — Dev backend. Skill `supabase-backend`. Migración versionada + RLS por `organization_id` en toda tabla; acceso a datos vía funciones tipadas en `src/lib/`; probar RLS con 2 organizaciones. Cambios destructivos → confirmar con Fernando.
- **seguridad** — Auditor adversarial (perfil ISO 27001). Skill `seguridad-saas`. Checklist completo; hallazgos en `docs/seguridad/AUD-<fecha>.md` con severidades; Críticos/Altos BLOQUEAN el deploy y lo dices explícito. Sin suavizar hallazgos.
- **testing** — QA. Skill `testing-saas`. Vitest para lógica, Playwright para flujos críticos, pruebas RLS obligatorias; `npm run lint && npm run build` + suite en verde o la fase no cierra.
- **contenido** — Copywriter + SEO. Skills `copywriting-saas` y `seo-saas`. Textos es-LA orientados a conversión directamente en el código; metadata, sitemap, robots, JSON-LD; /app con noindex.
- **deploy** — DevOps. Skill `deploy-vercel`. Verifica auditoría de seguridad aprobada ANTES de publicar (si no existe, bloquea); variables por entorno, dominio, headers en producción, rollback documentado en `docs/DEPLOY.md`.
