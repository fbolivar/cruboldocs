# Auditoría de seguridad — Integraciones (Zapier/Make + Importación CSV) (v1.6-4)

**Fecha:** 2026-11-13 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** `GET /api/v1/me` + `authenticateAny` (`src/lib/api/keys.ts`), parser `parseCsv` (`src/lib/csv.ts`), motor de importación (`runImport`/`previewImport`/`commitImport` en `actions.ts`), metadatos `src/lib/import/schema.ts`, UI (pestaña Administración → Importar: `ImportPanel`/`ImportPreviewTable`/`IntegrationsHelp`), gate `AdminTab "importar"`, guía `docs/api/INTEGRACIONES.md`. **Sin migración ni cambios de base de datos.**

## Resumen ejecutivo (3 líneas)
La importación corre como **server action del usuario autenticado** (gate `canManageCatalog` = Admin de organización o Líder SIG) y **reutiliza las reglas de creación de la app** (inserts con RLS en procesos/cargos; RPC `create_supplier`/`create_requirement` con su propia autorización), por lo que no puede crear ni cruzar datos fuera de la organización; **nunca acepta un `organization_id` del CSV**. `GET /api/v1/me` solo devuelve id/nombre de la organización, scopes y nombre de la key (sin datos del negocio), con la misma auth Bearer + rate-limit del resto de la API. El flujo es **dos pasos** (previsualizar sin escribir → confirmar). **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| IG-01 | Medio | Carga masiva podría saltarse reglas o cruzar organización. | La importación usa el cliente **autenticado** del usuario: inserts de procesos/cargos pasan por **RLS**; proveedores/requisitos por **RPC existentes** con `can_manage_suppliers`/`can_manage_legal`; `organization_id` se fija al del usuario, nunca del CSV; gate `canManageCatalog` en la server action. | Mitigado |
| IG-02 | Bajo | DoS por archivo enorme / fórmulas en CSV. | `parseCsv` limita a 1000 filas y exige cabecera; la **plantilla** se genera con `toCsv` (anti-fórmula); la importación solo crea las filas válidas. | Mitigado |
| IG-03 | Bajo | Importación parcial inconsistente. | **Dry-run** obligatorio con informe por fila antes de escribir; en el commit cada fila es independiente y se reporta (creadas/omitidas); duplicados detectados contra lo existente y dentro del lote. | Aceptado |
| IG-04 | Info | Nuevo endpoint `GET /api/v1/me`. | Requiere Bearer válido (cualquier scope), con rate-limit por clave; devuelve solo `{organization:{id,name}, scopes, key_name}`; sin datos del negocio ni PII. | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** el motor fija `organization_id = user.organization.id`; los inserts de `processes`/`positions` quedan bajo sus políticas RLS; `create_supplier`/`create_requirement` validan `p_org` y la pertenencia del proceso. No hay forma de inyectar otra organización desde el CSV ni desde el cliente. **Sin tablas, RPC ni anon nuevos** → RLS del proyecto sin cambios (738 pruebas).
- **Autorización:** `runImport` exige `canManageCatalog` (Admin u org / Líder SIG); además, cada RPC de proveedores/requisitos aplica su propia autorización (una fila sin permiso de proceso se reporta como error, no se crea).
- **Robustez del parseo:** `parseCsv` con 7 pruebas unitarias (separador `;`/`,`, comillas y `""` escapado, BOM, CRLF, filas vacías, límite de 1000, archivo vacío); no usa dependencias nuevas.
- **Dos pasos:** `previewImport` no escribe nada (solo valida y resuelve referencias); `commitImport` re-parsea el CSV en el servidor (no confía en filas del cliente) y crea solo las válidas; `log_event` de lote (no bloqueante).
- **`/api/v1/me`:** `authenticateAny` verifica el hash de la key (nunca el token en claro), descarta revocadas, aplica rate-limit por clave y no exige scope; la respuesta no incluye datos del negocio.
- **Fuga / inyección:** zod/validación por enums en cada entidad; `dbMessage` no filtra nombres internos; la guía no expone secretos; el webhook sigue firmado (sin cambios).
- **Advisors Supabase:** sin cambios (no hay objetos nuevos en la base).

## Conclusión
El módulo se puede desplegar. La importación es una capa que reutiliza las reglas y la RLS existentes bajo un gate de administración, con previsualización previa y sin aceptar organización del CSV; `/api/v1/me` expone solo metadatos de conexión. No hay base de datos nueva ni superficie de escritura sin control. No quedan Críticos ni Altos; los ítems restantes quedan mitigados o aceptados conforme a ADR-124/125/126.
