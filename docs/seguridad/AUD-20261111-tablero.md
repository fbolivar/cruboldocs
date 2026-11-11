# Auditoría de seguridad — Tablero configurable (v1.3-3b)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** preferencia del tablero por usuario.
**Migración:** `supabase/migrations/043_tablero_preferencias.sql` · **Capa de datos:** `queries.ts` (getDashboardLayout) + `actions.ts` (setDashboardLayout) + `src/lib/domain/dashboard-blocks.ts` · **UI:** `src/components/tablero/customize-dashboard-sheet.tsx`, refactor `src/app/app/tablero/page.tsx`.

## Resumen ejecutivo
Personalización del tablero **por usuario**: una tabla `dashboard_preferences` con **RLS sobre la propia fila** (`user_id = auth.uid()`) y escritura por RPC `SECURITY DEFINER` (`search_path=''`) que fija `user_id = auth.uid()` y **valida las claves contra un catálogo fijo**. No cambia ningún dato del SGC (el tablero sigue leyendo `getDashboard`). Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Aislamiento entre usuarios | RLS `select` con `user_id = auth.uid()`; Sofía no ve la preferencia de Juan. El RPC fija `user_id = auth.uid()` (no acepta user_id de parámetro) → nadie escribe la de otro. Pruebas RLS. | OK |
| 2 | Verificado | Validación de la configuración | El RPC rechaza no-array y **claves fuera del catálogo** (`Bloque desconocido`); la server action valida con zod (enum de 8 claves). Al leer, `mergeLayout` ignora claves desconocidas y anexa nuevas. Pruebas RLS. | OK |
| 3 | Verificado | Aislamiento multi-tenant | `set_dashboard_layout` exige `is_active_member(p_org)`; Beto (org B) rechazado ("Sin acceso"). PK (organization_id, user_id). Prueba RLS. | OK |
| 4 | Verificado | Escritura solo por RPC | Sin políticas insert/update → INSERT directo por REST rechazado (RLS). Upsert único por usuario (probado). | OK |
| 5 | Info | RPC `SECURITY DEFINER` ejecutable por `authenticated` | Advisor del patrón; `set_dashboard_layout` **no** ejecutable por `anon` (advisor anon sigue en 2). `dashboard_preferences` tiene política SELECT (no entra en deny-all). | Aceptado |
| 6 | Verificado | Sin dato sensible ni ampliación de superficie | El layout son claves de bloque (no datos); el tablero mantiene su gate `canSeeDashboard` y su RLS. Sin dato personal. | OK |

## search_path / secretos
- `function_search_path_mutable` = **0**; `rls_enabled_no_policy` sin cambios (19, contadores); `dashboard_preferences` con RLS + política.
- Sin secretos, sin dependencias nuevas, sin IA.

## Checklist
- [x] RLS por usuario (user_id = auth.uid()) en lectura; escritura por RPC que fija el user_id
- [x] Validación de claves contra catálogo fijo (servidor) + zod
- [x] Aislamiento multi-tenant y entre usuarios probado
- [x] tsc + lint + 535 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, search_path 0)
