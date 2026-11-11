# Auditoría de seguridad — v1.1-1: Tablero gerencial (ISO 9001 9.1/9.3)

- **Fecha:** 2026-11-10
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** `src/lib/data/queries.ts` (`getDashboard`), `src/lib/data/actions.ts` (`exportDashboardCsv`), `src/components/tablero/*`, `src/app/app/tablero/page.tsx`, `src/lib/domain/access.ts` (`canSeeDashboard`), nav. **Módulo de solo lectura: NO crea tablas, NO añade migración, NO añade RLS, NO añade dependencias.**

## Resumen ejecutivo (3 líneas)
El Tablero es una **composición de lectura** sobre las tablas de los 8 módulos, consultadas con el **cliente del usuario** (`scope().supabase`) y filtradas por `organization_id`, de modo que la **RLS existente** impide el cruce entre organizaciones (doble barrera: `.eq(organization_id)` explícito + política RLS). No usa `service_role` ni admin, no interpola SQL, muestra solo **agregados** (sin dato personal) y exporta respetando la RLS. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · 0 Bajos. Habilitado para testing y despliegue.

## Verificaciones (sin hallazgos)

### Aislamiento multi-tenant
- `getDashboard` lee **siempre** con `s.supabase` (cliente del usuario, `scope()`), nunca `createAdminClient`/`service_role`; cada consulta lleva `.eq("organization_id", org)` donde `org` proviene de la **sesión** (`scope().org`), no de un parámetro del cliente. Doble barrera con la RLS ya activa de cada tabla.
- El filtro de **proceso** (`?proceso=<uuid>`) solo **filtra** filas ya acotadas por RLS: un `process_id` de otra organización no coincide con ninguna fila visible → resultado vacío, sin fuga. `objectives_with_progress(p_org)` valida `can_see_objectives` internamente y filtra por `p_org`.
- `exportDashboardCsv` valida `processId` con `isUuid` y `year` como entero, reutiliza `getDashboard` (misma RLS) y arma el CSV con `toCsv` (neutraliza inyección de fórmulas). No usa admin.

### Dato personal y exposición
- El tablero y su impresión muestran **conteos y porcentajes agregados**; **no** exponen asistentes de actas, nombre/contacto de PQRS, firmantes ni IP. `PrintHeader` solo imprime organización, periodo, proceso y fecha. El CSV por panel exporta únicamente etiquetas y cifras agregadas.

### Autorización / acceso
- `canSeeDashboard` = roles del SIG + dirección (gerente/aprobador); la página hace `getCurrentUser` y corta con `EmptyState` si no aplica. Los roles que ven menos (p. ej. consulta, líder de proceso) ven el tablero **acotado por su propia RLS** (no se les amplía nada: las mismas políticas de cada módulo gobiernan qué filas cuentan).

### Dependencias / superficie
- **Cero dependencias nuevas** (ADR-036/037): CSV con `toCsv`, PDF por impresión del navegador (`@media print` vía `print:!hidden` en el shell + `PrintHeader`), gráficas en SVG/CSS con tokens. Sin Storage, sin correo, sin cron, sin endpoints nuevos. La exportación es una Server Action (CSRF por origen de Next.js).
- **Sin objetos nuevos en la base** → los advisors de Supabase quedan en el **baseline** ya verificado tras la migración 028 (INFO en contadores deny-all; WARN SECURITY DEFINER aceptado; sin `function_search_path_mutable`). Esta fase no aplicó migración.

### Rendimiento (no es hallazgo de seguridad, se verifica)
- Las consultas se lanzan en **paralelo** (`Promise.all`) y son agregados baratos ya usados en Inicio/módulos; `documents` usa `count: exact, head: true` (no trae filas). El filtro de proceso/año se resuelve sobre conjuntos ya acotados por organización.

## Condiciones
- Ninguna que bloquee el despliegue. **Condiciones de ampliación:** si en el futuro se añade **XLSX** (`exceljs`) o **PDF server-side**, auditar esa dependencia y su render; si Crubol-Agent **resume** el tablero, re-auditar el envío de datos a la IA (ya acordado).
