# Auditoría de seguridad — BI / Constructor de informes (v1.4-6)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 052 (`saved_reports`, helper `can_manage_reports`, RPCs `create_saved_report`/`update_saved_report`/`discard_saved_report`), motor BI (`src/lib/bi/datasets.ts` catálogo, `compute.ts` `sanitizeConfig`/`runConfig`, `loadDataset` en queries, server action `runReport`/`exportReportCsv`), UI (lista + constructor + tabla/gráficas SVG).

## Resumen ejecutivo (3 líneas)
El constructor **no ejecuta SQL del usuario**: los 6 datasets son fijos en código, se leen con el **cliente del usuario** (RLS por organización) y el filtrado/agregación se calcula en el servidor sobre esas filas; el `config` de un informe se **depura contra el catálogo** (`sanitizeConfig`) antes de usarse, de modo que solo puede nombrar columnas/operadores permitidos. Los informes guardados tienen RLS por organización y ámbito (propio/compartido), con escritura por RPC `security definer`. Sin `anon` ni datos personales nuevos. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| R-01 | Info | El `config` del informe es JSON arbitrario provisto por el cliente. | Siempre pasa por `sanitizeConfig(dataset, config)` (lista blanca de columnas/operadores/agregación/gráfica) antes de correr o guardar; campos desconocidos se descartan. Nunca se concatena en SQL. | Mitigado |
| R-02 | Info | Un informe compartido lo ven todos los miembros de la organización. | Solo expone datos que esos miembros **ya pueden leer** por la RLS de cada dataset (el loader usa el cliente del usuario). Compartir lo restringe el Líder SIG. | Aceptado |
| R-03 | Bajo | Posible exposición entre organizaciones vía el motor. | Cada loader filtra por `organization_id` con el cliente del usuario (RLS); el `config` nunca nombra tablas ni `org`. Pruebas RLS 052: Beto (org B) no ve ni crea informes de A. | Mitigado |

## Verificaciones realizadas
- **Sin SQL del usuario (núcleo):** los datasets y columnas son constantes en código; `loadDataset` arma consultas fijas con el cliente del usuario; el `config` solo selecciona/filtra/agrupa en memoria tras `sanitizeConfig`. No hay SQL dinámico ni `execute` de texto del cliente.
- **Aislamiento multi-tenant:** `saved_reports` con RLS `is_active_member AND is_active AND (scope='compartida' OR created_by=auth.uid())`; los loaders heredan la RLS de cada tabla fuente. Verificado con 2 orgs.
- **Autorización de escritura:** crear compartida y editar/compartir exige `can_manage_reports` (Líder SIG/Admin); editar/eliminar un informe propio lo permite su autor; la consulta no comparte ni edita ajenos; otra org rechazada ("Sin acceso").
- **Validación:** dataset contra lista blanca (constraint + RPC + action); `scope` validado; zod en las actions; `sanitizeConfig` degrada agregaciones inválidas (suma/promedio sin campo numérico → conteo) y oculta gráfica sin agrupación (probado en unit).
- **Sin hard delete:** "eliminar" es baja lógica (`is_active=false`); la RLS lo oculta.
- **Sin anon ni PII nueva:** ninguna función del módulo es `anon`-ejecutable; `search_path=''` en todas; el CSV se genera en el servidor sobre el resultado ya filtrado (anti-fórmula vía `toCsv`).

## Conclusión
El módulo se puede desplegar. No hay Críticos ni Altos; los ítems Info/Bajo quedan mitigados o aceptados conforme a ADR-097/098/099.
