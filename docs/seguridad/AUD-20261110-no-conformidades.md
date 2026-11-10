# AUD-20261110-NC — Auditoría de seguridad · Módulo No Conformidades / CAPA

- **Fecha:** 2026-11-10 · **Rama:** `fase/testing` · **Proyecto Supabase:** `dcteuwybqtktwvpfweyr`
- **Alcance:** módulo No Conformidades — migraciones `017_no_conformidades.sql` y `018_nc_verify_fix.sql`, capa de datos (`queries.ts`/`actions.ts`), componentes `src/components/no-conformidades/*`, páginas `src/app/app/no-conformidades/**`, navegación.
- **Método:** revisión adversarial de código + razonamiento sobre la máquina de estados y casos NULL + advisors de Supabase (security) + suite `npm run test:rls` (201). Perfil ISO/IEC 27001:2022.
- **Contexto:** espejo del módulo de riesgos (veredicto APTO en AUD-20260924).

## 1. Resumen ejecutivo

El aislamiento multi-tenant es sólido: FKs compuestas `(id, organization_id)` impiden enlazar datos de otra organización, RLS deja solo lectura y toda escritura pasa por funciones `SECURITY DEFINER` que validan permiso y auditan; 201 pruebas RLS en verde.
La revisión adversarial halló **1 Medio**: `verify_nc` autorizaba con `my_position IS NOT DISTINCT FROM owner_position_id`, y como `NULL IS NOT DISTINCT FROM NULL` es verdadero, un miembro sin cargo podía verificar una NC sin dueño; se corrigió (migración 018 + prueba). Queda **1 Bajo** aceptado (sin límite de ráfaga al reportar).
**0 Críticos, 0 Altos.** Todos los hallazgos accionables remediados y re-verificados.

**Veredicto: APTO** para continuar a testing y deploy, con la condición de §4 (auditar la subida/descarga de evidencias cuando se implemente).

| Severidad | Abiertos | Remediados |
|---|---|---|
| Crítica | 0 | 0 |
| Alta | 0 | 0 |
| Media | 0 | 1 |
| Baja | 1 (aceptado) | 0 |

## 2. Hallazgos

| ID | Sev. | Descripción | Evidencia | Estado / Remediación |
|---|---|---|---|---|
| **MED-01** | Media | **Bypass de autorización en `verify_nc` por NULL.** La verificación de eficacia se permitía con `my_position(org) IS NOT DISTINCT FROM owner_position_id`. Si la NC no tenía dueño (`owner_position_id` NULL) y el actor no tenía cargo (`my_position` NULL), la comparación daba verdadero → un miembro cualquiera podía cerrar o reabrir la NC, saltándose el control de eficacia que exige el auditor externo (ADR-008). ISO A.8.2/A.8.3. | `017_no_conformidades.sql` `verify_nc` (versión original). Precondiciones: NC en `verificacion` sin dueño + miembro con `position_id` NULL. | **Remediado (018):** se exige `owner_position_id is not null AND my_position = owner_position_id`. Prueba RLS nueva («Miembro sin cargo no verifica una NC sin dueño»). |
| **BAJ-01** | Baja | **Sin límite de ráfaga al reportar.** `report_nonconformity` lo puede llamar cualquier miembro activo sin límite → un usuario autenticado podría crear muchas NC. Acotado (requiere sesión; el impacto es ruido en el tablero, no fuga ni escalada). ISO A.8.6. | `actions.ts` `reportNonconformity` (sin rate limit). | **Aceptado** por ahora. Recomendación: aplicar un límite por usuario (patrón `agente:usuario`) si aparece abuso. |

## 3. Controles verificados (sin hallazgos)

- **Aislamiento multi-tenant.** `nonconformities`/`nc_actions`/`nc_evidences` referencian a `processes`/`risks`/`positions` por **FK compuesta `(id, organization_id)`**: no se puede asignar un proceso, riesgo o cargo de otra organización. RLS solo-SELECT (`can_see_nonconformities` o el reportante); `nc_counters` sin políticas (deny-all, solo la función). 201 pruebas RLS cubren aislamiento, reporte abierto, visibilidad/gestión por rol y proceso, ciclo completo, verificación obligatoria y numeración.
- **Escritura y auditoría.** Todas las transiciones van por RPC `SECURITY DEFINER` con `search_path=''`, chequeo de permiso (`is_active_member`, `can_manage_nc`, responsable) y `log_event`. No hay políticas de escritura → el `insert` directo por REST falla (probado). Las demás transiciones con NULL son seguras: `complete_nc_action`/`add_nc_evidence` comparan contra `responsible_position_id` (NOT NULL), sin el hueco de `verify_nc`.
- **CSRF.** Las mutaciones son **Server Actions de Next**, con verificación de origen integrada (a diferencia de un route handler). Sin hallazgo.
- **Validación de entrada.** Las server actions validan con zod; los enums (origen, severidad, tipo, estado) los fuerza un `CHECK` en la base. La numeración `NC-AAAA-###` es atómica (`nc_counters`).
- **Fuga de información.** `dbMessage` reenvía solo los mensajes redactados (42501/22023/P0002) y oculta los nativos de RLS/permiso (AUD RA-13).
- **Advisors de Supabase.** INFO `nc_counters` sin política = deny-all intencional (como `email_outbox`). WARN `SECURITY DEFINER` ejecutable por `authenticated` = patrón aceptado; los RPCs validan permiso internamente.

## 4. Condición

Cuando se implemente la **subida/descarga de evidencias de NC** (hoy diferida; el ciclo CAPA funciona sin ella), auditar la política de lectura en Storage y el flujo de URL firmada, igual que para documentos/controles (`add_nc_evidence` ya valida que la ruta empiece por el `organization_id`).

## 5. Verificación

- `npx tsc --noEmit` ✓ · `npm run lint` ✓ · `npm run test` 166/166 ✓ · `npm run test:rls` **201/201** ✓ · `npm run build` ✓.
- Migración 018 aplicada a la base. Hallazgos abiertos: **0 Críticos, 0 Altos, 0 Medios**; 1 Bajo aceptado. Veredicto **APTO**.
