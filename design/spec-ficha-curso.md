# Design Spec — Ficha de curso (`/app/capacitacion/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pwa-lms/ARQUITECTURA.md (4b) + ADR-059.

## 1. Propósito y protagonista
- **Qué logra:** ver y **diseñar** el curso (material + preguntas), **publicarlo**, y ver los **resultados** de quienes lo tomaron.
- **Protagonista:** el **contenido del curso y su evaluación** (lo que se aprende y mide).
- **Roles:** gestionar (editar/publicar/preguntas) = Líder SIG o Líder del proceso; **tomar** = cualquier miembro; ver resultados = roles del SIG.

## 2. Wireframe (escritorio)
```
‹ Capacitación
CAP-2026-003  Inducción en SST   ■ Publicado  Aprob. 70%   [ Tomar ] [ Editar ] [ ⋯ ]
Proceso SST · 8 preguntas

MATERIAL
┌──────────────────────────────────────────────────────────────────────┐
│ (texto/markdown del curso o enlace al recurso)                        │
└──────────────────────────────────────────────────────────────────────┘

EVALUACIÓN (8 preguntas)                                      [ + Pregunta ]  (borrador)
1. ¿Qué es un EPP? · 4 opciones (1 correcta)                       [✎] [🗑]
2. …

RESULTADOS (15)                                               [ Exportar CSV ]
┌──────────────────────────────────────────────────────────────────────┐
│ Ana Ruiz · 2026-11-09 · 88% · ■ Aprobado                              │
│ Juan Pérez · 2026-11-08 · 60% · ■ No aprobado                        │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** "‹ Capacitación"; código, título, **badge de estado**, **umbral**; acciones **"Tomar"** (si publicado), **"Editar"** (datos, Sheet), menú **⋯** (publicar / archivar / duplicar).
- **Material:** texto/markdown renderizado o enlace al recurso. Editable en el Sheet "Editar" (si gestiona).
- **Evaluación:** lista de preguntas (nº, enunciado, nº de opciones). Si **gestiona** y está en **borrador**: **"+ Pregunta"** (Sheet: enunciado + **opciones**, marcando **la correcta**), **✎ editar**, **🗑 eliminar**. **Publicar** exige **≥1 pregunta** con una opción correcta.
- **Resultados:** lista de inscripciones (quién, fecha, **puntaje %**, **aprobado/no aprobado** con badge). **"Exportar CSV"**. Vacío: "Aún nadie ha tomado el curso".
- (Opcional) **Trazabilidad** `NcTimeline`.

## 4. Publicar
- **"Publicar"** confirma ("El curso quedará disponible para tomarse"). Estado → **Publicado**; las preguntas se usan para evaluar. (Sin versionado en v1: editar un publicado ajusta el curso vigente; el versionado se difiere.)

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + material + preguntas + resultados. |
| Borrador sin preguntas | La evaluación muestra "Agrega preguntas"; "Publicar" deshabilitado. |
| Publicado | Material y evaluación en solo lectura para el gestor (editar ajusta el curso); "Tomar" visible. |
| Solo lectura (no gestiona) | Ve material, estructura y resultados; puede "Tomar" si es miembro. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Accesibilidad
- Estado/resultado nunca por color solo (badge con texto). El editor de preguntas marca **la opción correcta** de forma accesible (radiogroup). "Publicar" confirma.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Textarea, Input, EmptyState, SectionError, DropdownMenu, NcTimeline | Reutilizados | |
| CourseStatusBadge | Reutilizado (de la lista) | |
| **QuestionList** + **QuestionEditorSheet** | Nuevo | preguntas + alta/edición (opciones con la correcta) |
| **CourseResults** + ExportResultsCsvButton | Nuevo | inscripciones/resultados + CSV |
| CourseDataSheet, PublishCourseButton | Nuevo | editar datos/material; publicar |

## 8. Decisiones y porqués
- **Opciones con "la correcta" solo en el diseñador:** la respuesta correcta vive en el curso; al **tomarlo** nunca se envía al cliente (ADR-059). La calificación es server-side.
- **Resultados como evidencia:** 7.2 se audita por la evidencia de evaluación y aprobación.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
