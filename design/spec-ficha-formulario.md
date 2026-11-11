# Design Spec — Ficha de plantilla y respuestas (`/app/formularios/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/formularios/ARQUITECTURA.md + ADR-046/047.

## 1. Propósito y protagonista
- **Qué logra:** ver la plantilla (datos + campos) y sus **respuestas** recolectadas; exportarlas.
- **Protagonista:** la **lista de respuestas** (la evidencia).
- **Roles:** ver = roles del SIG; gestionar (publicar/versionar/archivar, ir al diseñador) = Líder SIG / Líder del proceso; diligenciar = cualquier miembro.

## 2. Wireframe (escritorio)
```
‹ Formularios
FORM-2026-003  ⬒ Inspección   ■ Publicado v2      [ Diligenciar ] [ Diseñar ] [ ⋯ ]
Inspección de EPP · Proceso SST · 12 campos

RESPUESTAS (24)                                            [ Exportar CSV ]
┌──────────────────────────────────────────────────────────────────────┐
│ 2026-11-10 14:02 · Ana Ruiz · v2 · ■ Enviada                  [ Ver ] │
│ 2026-11-09 09:30 · Juan Pérez · v2 · ◻ Borrador                      │
└──────────────────────────────────────────────────────────────────────┘

ESTRUCTURA (v2)
1. ¿Usa casco? (Sí/No) *   2. Estado EPP (Selección) *   …
```

## 3. Secciones
- **Encabezado:** "‹ Formularios"; código, **chip de categoría**, **badge de estado + versión**, título, proceso, nº de campos; acciones **"Diligenciar"** (si publicada), **"Diseñar"** (si gestiona; abre el diseñador — borrador editable o solo lectura con "Nueva versión"), menú **⋯** (publicar/archivar/nueva versión/duplicar).
- **Respuestas:** lista (fecha/hora, **quién** la diligenció, **versión**, **estado** borrador/enviada); **"Ver"** abre la respuesta (modo lectura del formulario con los valores). **"Exportar CSV"**: una fila por respuesta **enviada**, columnas = etiquetas de los campos (de la versión); multiselección como lista separada. Vacío: "Aún no hay respuestas; comparte «Diligenciar»".
- **Estructura:** vista **solo lectura** de los campos de la versión vigente (orden, tipo, requerido), para auditar qué se pregunta.
- (Opcional) **Trazabilidad** `NcTimeline` (creación, publicación, versiones).

## 4. Móvil (≤640px)
- Encabezado apilado; acciones a ancho completo; respuestas como cards (fecha + persona + estado; "Ver" a ancho completo); estructura como lista. CSV en el encabezado de la sección.

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + filas de respuestas + estructura. |
| Vacío (sin respuestas) | `EmptyState`: "Aún no hay respuestas" + "Diligenciar" (si publicada). |
| Borrador (sin publicar) | La sección Respuestas indica "Publica la plantilla para empezar a recolectar"; CTA principal "Diseñar". |
| Solo lectura (no gestiona) | Sin acciones de gestión; ve respuestas y estructura; puede "Diligenciar" si es miembro. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Accesibilidad
- Estado/categoría nunca por color solo (badge/chip con texto). "Ver" respuesta navegable por teclado; la respuesta en lectura usa el mismo `FieldRenderer` en modo `readonly`.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, EmptyState, SectionError, DropdownMenu, NcTimeline | Reutilizados | |
| FormStatusBadge, FormCategoryChip | Reutilizados (de la lista) | |
| **SubmissionsList** + **SubmissionView** | Nuevo | lista de respuestas + ver una (FieldRenderer readonly) |
| **TemplateStructure** | Nuevo | vista solo lectura de los campos de la versión |
| ExportFormCsvButton | Nuevo | una fila por respuesta enviada |

## 8. Decisiones y porqués
- **Respuestas con su versión:** la evidencia se lee con la estructura con que se diligenció (ADR-047).
- **CSV por columnas = campos:** entregable directo para auditoría/análisis.
- **"Estructura" solo lectura:** el auditor ve qué pregunta la plantilla sin entrar al diseñador.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
