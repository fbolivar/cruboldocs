# Auditoría de seguridad — Caracterización de procesos (v1.3-2)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** módulo Caracterización de procesos (ISO 9001 4.4).
**Migración:** `supabase/migrations/042_caracterizacion_procesos.sql` · **Capa de datos:** `queries.ts` (getProcessMap/getProcessDetail) + `actions.ts` (updateProcessCharacterization/exportProcessesCsv) · **UI:** `src/components/procesos/*`, `src/app/app/procesos/**`.

## Resumen ejecutivo
Caracterización de procesos (4.4) sobre la tabla **existente** `processes` (columnas nullable) + una ficha que agrega lo ligado por `process_id`. No hay tablas nuevas: la postura RLS no cambia. La escritura de la caracterización es por RPC `SECURITY DEFINER` (`search_path=''`) autorizado por `can_manage_process`, sin tocar el catálogo de Admin. Los conteos agregados respetan la RLS de cada módulo (se consultan con el cliente del usuario). Sin críticos ni altos abiertos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Autorización de la caracterización | `update_process_characterization` exige `is_active_member` + `can_manage_process` (Líder SIG o Líder del proceso). Responsable de control y consulta rechazados; otra org rechazada ("no encontrado o sin acceso"). Pruebas RLS. | OK |
| 2 | Verificado | No se afecta el catálogo (separación de funciones) | El alta/baja de `processes` sigue en Admin; la caracterización se escribe por un RPC propio que solo toca columnas de caracterización + `characterized_at`. Columnas **nullable** (no rompe filas existentes). | OK |
| 3 | Verificado | Agregación sin fuga entre módulos | `getProcessDetail` cuenta por `process_id` con el **cliente del usuario** (RLS de cada tabla aplica): quien no ve riesgos obtiene conteo 0; no se usa `service_role`. | OK |
| 4 | Verificado | Aislamiento multi-tenant | Beto (org B) no caracteriza procesos de A; `process_id` siempre acotado por `organization_id` de la fila. Prueba RLS. | OK |
| 5 | Info | RPCs `SECURITY DEFINER` ejecutables por `authenticated` | Advisor `authenticated_security_definer_function_executable` (patrón del proyecto); `can_manage_process`/`update_process_characterization` **no** ejecutables por `anon` (advisor anon sigue en 2). | Aceptado |
| 6 | Verificado | Validación de entrada | Zod en la server action (cotas de texto por campo); el servidor **normaliza vacíos a null** (probado); sin dato personal nuevo (el responsable es un cargo). `dbMessage` evita fuga de errores. | OK |

## search_path / secretos / esquema
- `function_search_path_mutable` = **0**; **sin tablas nuevas** → `rls_enabled_no_policy` sin cambios (19, contadores).
- Sin secretos, sin adjuntos, sin dependencias nuevas, sin IA.

## Checklist
- [x] Escritura por RPC definer autorizado por líder; catálogo de Admin intacto
- [x] Agregación respeta la RLS de cada módulo (sin service_role)
- [x] Aislamiento 2 orgs probado
- [x] Normalización de entrada probada
- [x] tsc + lint + 527 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, search_path 0, baseline)
