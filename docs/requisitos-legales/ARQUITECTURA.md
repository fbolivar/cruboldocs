# Arquitectura — v1.1-3: Matriz de requisitos legales y evaluación de cumplimiento

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: S–M. Requisito de 14001/45001 (y buena práctica en 9001); muy pedido en el mercado. Espejo del patrón de Indicadores (ficha + evaluaciones con historial).

## 1. Negocio

- **Problema y para quién.** La organización debe **identificar los requisitos legales y otros requisitos** que le aplican y **evaluar periódicamente su cumplimiento** (obligatorio en ISO 14001 6.1.3 / 9.1.2 y 45001; en Colombia, la **matriz legal** es exigible en SG-SST, Dec. 1072). Hoy vive en Excel. Lo usa el **Líder SIG** (y el **Líder del proceso** dueño); el resto del SIG consulta.
- **Acción de valor principal.** Registrar un **requisito** (norma/fuente, artículo, qué exige, proceso aplicable) y **evaluar su cumplimiento** (cumple/parcial/no cumple) con fecha, responsable y evidencia; ver la **matriz** con su estado y las evaluaciones vencidas.
- **Cobro.** Sin cobro por módulo; plan único. Habilita el combo con el futuro multi-norma (v1.1-4).
- **Mercado.** Colombia/B2B. Diferencia frente a competidores que la cobran aparte.

## 2. Modelo de dominio

Reutiliza `organizations`/`processes`/`positions`. Multi-tenant por `organization_id`, FKs compuestas, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de Indicadores/NC).

1. **`legal_requirements`** — requisito legal/normativo. `id, organization_id, code (REQ-AAAA-###), title, source_type ('ley'|'decreto'|'resolucion'|'norma_iso'|'contractual'|'otro'), reference text (p. ej. "Decreto 1072/2015, art. 2.2.4.6"), description (qué exige), issuer text? (entidad emisora), process_id?, url text?, status ('vigente'|'derogado') default 'vigente', eval_frequency ('semestral'|'anual'|'bienal') default 'anual', created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`.
2. **`legal_evaluations`** — evaluación de cumplimiento (historial). `id, organization_id, requirement_id→legal_requirements(id,org), evaluated_at date, compliance ('cumple'|'parcial'|'no_cumple'), evidence text? (cómo se cumple / brecha), evaluated_by (cargo o usuario), next_eval_date date (derivada de la frecuencia), note text?, created_by/at`. `unique(id, organization_id)`. El **estado de cumplimiento vigente** del requisito = la **última** evaluación (derivado, como Indicadores); si no hay, "No evaluado".
3. **`legal_counters`** — contador atómico `REQ-AAAA-###` (deny-all).

### Relaciones / derivados
- `legal_requirements 1—N legal_evaluations`; el cumplimiento vigente y la próxima evaluación se derivan de la última.
- `parcial`/`no_cumple` podría generar una **NC** con un clic (reutilizaría `report_nonconformity`) → **diferido** (coherente con los módulos previos).

### Datos sensibles
- No hay dato personal (son requisitos y su evaluación). `evidence` es texto; se recomienda no pegar datos personales.

## 3. Alcance del MVP (cortado)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Registrar/editar **requisito** (`REQ-AAAA-###`, fuente, referencia, qué exige, proceso, frecuencia, URL) | **Sí** | Base del módulo. |
| **Evaluar cumplimiento** (cumple/parcial/no cumple, evidencia, fecha) con **historial** | **Sí** | El valor: evaluación periódica. |
| **Estado vigente derivado** (última evaluación) + **próxima evaluación** (según frecuencia) con realce si vencida | **Sí** | Como Indicadores. |
| Marcar requisito **derogado** (baja lógica) | **Sí** | Ciclo de vida sin DELETE (guard del MCP). |
| Matriz: tablero con filtros (fuente, cumplimiento, proceso, vencidas) + buscar + **CSV** | **Sí** | La "matriz legal" exportable es el entregable. |
| Recordatorio de **reevaluación** por el job diario (como proveedores) | **Sí** | Barato; reutiliza tasks+cron. |
| Requisito **incumplido → NC** con un clic | **No (diferido)** | Se evalúa en uso real (como módulos previos). |
| Adjuntar el PDF de la norma en Storage | **No (diferido)** | `url` basta en v1; adjuntos con el patrón endurecido luego. |
| Etiquetar por **norma** (9001/14001/45001) | **No aquí** | Es el **v1.1-4 (multi-norma)**; este módulo queda listo para recibir esa etiqueta. |

**Camino dorado:** el Líder SIG registra un **requisito** (Decreto 1072, art. X, proceso SST, frecuencia anual) → lo **evalúa** (parcial, con la brecha como evidencia) → la matriz muestra el estado **Parcial** y la **próxima evaluación**; al vencer, el job genera una **tarea** de reevaluación; al reevaluar, el estado se actualiza. Exporta la **matriz legal** a CSV para el auditor.

Pantallas: **2** — `/app/requisitos-legales` (tablero/matriz) y `/app/requisitos-legales/[codigo]` (ficha: datos + evaluaciones con historial).

## 4. Mapa de rutas

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/requisitos-legales` | Matriz: lista (código, título, fuente, proceso, cumplimiento vigente —badge—, próxima evaluación con realce); filtros fuente/cumplimiento/proceso/vencidas/buscar; Sheet "Nuevo requisito"; CSV. | Ver: roles SIG. Gestión: Líder SIG / Líder del proceso. |
| `/app/requisitos-legales/[codigo]` | Ficha: datos del requisito (fuente, referencia, qué exige, URL, proceso, frecuencia, estado vigente/derogado); **evaluaciones** (historial con cumplimiento/evidencia/fecha; "Evaluar"); derogar; trazabilidad (`NcTimeline`). | Ídem. |

## 5. Integraciones y riesgos

**Integraciones (reutilizadas):** tareas+cron (reevaluación), `log_event`, CSV, procesos/cargos. Sin dependencias nuevas. Diferidos: →NC, adjuntos, etiqueta de norma (v1.1-4).

**Top 3 riesgos y mitigación:**
1. **Aislamiento multi-tenant.** → `organization_id` + FKs compuestas + RLS solo-SELECT por roles SIG; escritura por RPC con `can_manage` por proceso; prueba de 2 organizaciones.
2. **Estado de cumplimiento inconsistente.** → Se **deriva** de la última evaluación (no se captura un estado suelto); `next_eval_date` se calcula server-side de la frecuencia (como Indicadores/Proveedores).
3. **Alcance se infla hacia multi-norma.** → Este módulo es solo la **matriz legal**; la etiqueta por norma y los registros 45001/14001 son el **v1.1-4**; aquí se deja el `process_id` y se evita acoplar.

## Decisiones (ADR)
- **ADR-041** — Modelo `legal_requirements` + `legal_evaluations` (historial) + contador `REQ-AAAA-###`; **cumplimiento vigente derivado** de la última evaluación (espejo de Indicadores); baja lógica `status='derogado'` (sin DELETE).
- **ADR-042** — Reevaluación por `eval_frequency` → `next_eval_date` server-side + **tarea** `evaluar_requisito` por el job diario (reutiliza tasks+cron); →NC y adjuntos **diferidos**.

## Checklist de salida
- [x] Multi-tenant (org + RLS) reutilizado; sin dato personal.
- [x] MVP en 2 pantallas.
- [x] Camino dorado de punta a punta (registrar → evaluar → derivar → reevaluar → exportar).
- [x] Riesgos con mitigación.
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
