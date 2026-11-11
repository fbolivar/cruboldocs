# Arquitectura — Causa raíz estructurada (v1.5-2)

**Producto:** CrubolDocs · **Feature:** v1.5-2 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** hoy la causa raíz de una NC es **texto libre**. Los auditores piden método: 5 Porqués, Ishikawa (espina de pescado). Sube la madurez de las investigaciones.
- **Acción de valor:** dentro de la NC, el Líder SIG elige un **método** (5 Porqués o Ishikawa 6M), lo completa de forma guiada, y con un botón **"Usar como causa raíz"** vuelca la conclusión al campo de causa raíz existente (que sigue siendo la fuente única del flujo).
- **Decisiones (Fernando):** (1) **5 Porqués + Ishikawa** (sin 8D); (2) el análisis **alimenta la causa raíz** de la NC; (3) **un análisis por NC**, método elegible.
- **Dato personal:** ninguno (es análisis técnico de la NC).

## 2. Modelo / técnica
- **`rca_analyses`**: `(id, organization_id, nonconformity_id, method text check in ('5porques','ishikawa'), data jsonb, conclusion text, created_by, created_at, updated_at; unique(nonconformity_id, organization_id); unique(id, organization_id); FK (nonconformity_id, organization_id) → nonconformities)`. **Uno por NC** (unique). RLS select por `is_active_member` (la visibilidad de la NC ya la gobierna su RLS); escritura por RPC.
  - `data` **5 Porqués**: `{ problem: string, steps: string[] }` (cada paso = respuesta a "¿por qué?"; el último suele ser la causa raíz).
  - `data` **Ishikawa (6M)**: `{ categories: { metodo: string[], maquina: string[], mano_obra: string[], material: string[], medio: string[], medicion: string[] } }`.
  - `conclusion`: la causa raíz identificada (texto).
- **RPC `save_rca_analysis(p_nc, p_method, p_data jsonb, p_conclusion)`**: upsert **uno por NC**; autoriza `can_manage_nonconformities` (org/proceso de la NC); valida `method` y que `data` sea un objeto; `conclusion` opcional. `log_event`.
- **"Usar como causa raíz":** el frontend llama a la acción existente **`setNcCause(ncId, conclusion)`** — no se duplica la causa; `rca_analyses` guarda el *cómo* y la NC guarda la causa final.
- **Sin dependencias nuevas; sin IA aquí** (la IA de v1.5-1 ya puede redactar la causa en texto; esto es la herramienta estructurada, complementaria).

## 3. Alcance del MVP
| Feature | ¿v1.5-2? | Justificación |
|---|---|---|
| Editor 5 Porqués (cadena N pasos) en la NC | **Sí** | Método más usado |
| Editor Ishikawa 6M (causas por categoría) en la NC | **Sí** | Decisión de Fernando |
| `rca_analyses` (uno por NC) + guardar | **Sí** | Núcleo |
| "Usar como causa raíz" → alimenta `root_cause` | **Sí** | Decisión de Fernando |
| Pre-llenar el análisis con IA | No | La IA de contenido (v1.5-1) ya redacta la causa; integrarla al editor estructurado se difiere |
| 8D | No | Decisión de Fernando (fuera) |
| Varios análisis por NC | No | Uno por NC (decisión de Fernando) |
| Diagrama gráfico de espina de pescado | No | Se representa por categorías (listas); el dibujo SVG se difiere |

**Camino dorado:** en una NC, el Líder SIG abre **Análisis de causa**, elige **5 Porqués**, encadena las respuestas hasta la causa raíz, guarda el análisis y pulsa **"Usar como causa raíz"** → la conclusión queda en el campo de causa de la NC y el flujo CAPA continúa igual.

## 4. Mapa de rutas
- **Sin rutas nuevas.** El análisis vive en la **ficha de NC**, en la sección "Análisis de causa" (junto al campo de causa raíz actual). Visible a quien ve la NC; editable por quien la gestiona.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Dos lugares para "la causa"** → `rca_analyses` guarda el método/razonamiento y `nonconformities.root_cause` la causa final; "Usar como causa raíz" las sincroniza con un clic; la fuente única del flujo sigue siendo `root_cause`.
2. **Aislamiento entre organizaciones** → FK compuesta `(nonconformity_id, organization_id)`, RLS por `organization_id`, escritura por RPC con `can_manage_nonconformities`.
3. **Datos inválidos en `data`** → la RPC valida `method` y que `data` sea objeto; el detalle (listas, pasos) lo valida la server action con zod antes de guardar.

## ADRs

### ADR-106 — Análisis estructurado como registro aparte que alimenta la causa raíz
**Contexto:** no romper el campo `root_cause` que ya consume el flujo.
**Decisión:** tabla `rca_analyses` (uno por NC) con el método y su estructura; "Usar como causa raíz" vuelca la conclusión a `nonconformities.root_cause` vía la acción existente.
**Consecuencias:** se conserva el *cómo* sin duplicar la fuente de verdad; cero cambios en el flujo CAPA.

### ADR-107 — 5 Porqués e Ishikawa por JSONB (sin 8D)
**Contexto:** dos métodos de estructura distinta, acotados.
**Decisión:** un solo registro con `method` + `data jsonb` (cadena de pasos / categorías 6M); validado contra el método en la app.
**Consecuencias:** modelo simple y extensible; 8D y el diagrama gráfico quedan diferidos.

### ADR-108 — Uno por NC, método elegible
**Contexto:** claridad para el auditor.
**Decisión:** `unique(nonconformity_id)`; cambiar de método sobrescribe el análisis.
**Consecuencias:** una sola investigación por NC; sin historial de métodos previos (aceptable).

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (editor 5 Porqués / Ishikawa en la ficha de NC). Luego backend, seguridad, deploy. Después v1.5-3 SCAR.
