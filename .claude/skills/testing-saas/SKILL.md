---
name: testing-saas
description: Estrategia de pruebas para SaaS — Vitest para lógica, Playwright para flujos E2E críticos, pruebas de RLS y checklist de regresión. Usar al cerrar features y antes de cada release.
---

# Testing SaaS

## Estrategia (pirámide pragmática)
No se busca 100% de cobertura: se prueban los flujos que, si fallan, pierden clientes o datos.

1. **Unitarias (Vitest)** — lógica de negocio pura: cálculos, validaciones Zod, helpers de límites de plan, formateo de fechas/moneda.
2. **E2E (Playwright)** — flujos críticos completos contra la app real:
   - Registro → verificación → crear organización
   - Login / logout / ruta protegida sin sesión redirige
   - Camino dorado del producto (la acción de valor principal)
   - Checkout en modo test de Stripe (hasta la pantalla de Stripe)
3. **RLS (SQL/Supabase)** — con dos usuarios de dos organizaciones: cada operación CRUD del usuario A sobre datos de la org B debe fallar. Estas pruebas son obligatorias, no opcionales.

## Configuración
- `npm i -D vitest @testing-library/react playwright` + `npx playwright install chromium`.
- Scripts en package.json: `test` (vitest run), `test:e2e` (playwright test), `check` (lint + build + test).
- E2E contra entorno local con proyecto Supabase de desarrollo y datos seed (`supabase/seed.sql` con 2 orgs y 2 usuarios de prueba).

## Regresión y releases
- `docs/QA-CHECKLIST.md`: lista manual mínima (10-15 ítems) que se recorre antes de cada release — responsive móvil, estados vacíos, errores de red, correo de bienvenida llega.
- Regla de cierre: un feature sin test de su flujo feliz no está terminado.
- Antes de deploy: `npm run check` + suite E2E en verde. Cualquier rojo bloquea.

## Checklist de salida
- [ ] Flujos críticos con E2E en verde
- [ ] Pruebas de RLS con 2 organizaciones pasando
- [ ] `npm run check` limpio
- [ ] QA-CHECKLIST.md actualizado con lo nuevo del release
