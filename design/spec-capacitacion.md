# Design Spec — Capacitación: lista de cursos (`/app/capacitacion`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pwa-lms/ARQUITECTURA.md (4b) + ADR-059.

## 1. Propósito y protagonista
- **Qué logra:** ver los **cursos** de la organización, crear uno nuevo, y entrar a diseñarlo, tomarlo o ver sus resultados.
- **Protagonista:** la **lista de cursos** con su estado (Borrador / Publicado / Archivado).
- **Roles:** crear/editar/publicar = Líder SIG o Líder del proceso; **tomar** = cualquier miembro activo; ver = roles del SIG.

## 2. Wireframe (escritorio)
```
Capacitación (h1)                                             [+ Nuevo curso]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Cursos    6  │ │ Publicados 4 │ │ Aprobaciones (mes) 12│
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Estado ▾ ] [ Proceso ▾ ] [ Buscar… ]

┌──────────────────────────────────────────────────────────────────────┐
│ CAP-2026-003  Inducción en SST            ■ Publicado   Aprob. 70%     │
│ Proceso SST · 8 preguntas · 12 aprobados          [ Tomar ] [ ⋯ ]     │
├──────────────────────────────────────────────────────────────────────┤
│ CAP-2026-002  Manejo de residuos          ◻ Borrador   Aprob. 80%     │
│ 0 preguntas · 0 aprobados                          [ Diseñar ] [ ⋯ ]  │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + **"+ Nuevo curso"** (si gestiona).
- **Resumen** (3 `StatCard`): cursos totales, **publicados**, **aprobaciones del mes** (inscripciones `aprobado` del periodo).
- **Filtros** (cliente): **Estado** (borrador/publicado/archivado), **Proceso**, **Buscar** (código/título).
- **Lista** (cards/filas): **código** (`mono`), **título** (protagonista), **badge de estado**, **umbral de aprobación** (`Aprob. N%`); segunda línea `texto-sec`: proceso · "N preguntas" · "M aprobados". Acción primaria contextual: **"Tomar"** si publicado; **"Diseñar"** si borrador (y gestiona); menú **⋯** (ver ficha/resultados, publicar/archivar, duplicar). Archivados atenuados y ocultos por defecto (toggle).
- **Sheet "Nuevo curso":** **Título** (req), **Proceso** (opc.), **Descripción** (opc.), **Umbral de aprobación %** (número, def. 70). Footer **"Crear y diseñar"** → `CAP-AAAA-###` en **borrador** y navega a la ficha.

## 4. Componentes nuevos
| Componente | Notas |
|---|---|
| **CourseStatusBadge** | borrador→advertencia, publicado→exito, archivado→neutro. |
| CoursesSummaryBar, CoursesBoard, NewCourseSheet, CourseRowMenu | espejo de Formularios. |

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + filas. |
| Vacío | `EmptyState` (ícono birrete): "Aún no hay cursos" + "Crear el primero" (si gestiona). |
| Vacío por filtro | "Ningún curso coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/`router.refresh()`. |

## 6. Accesibilidad
- Estado nunca por color solo (badge con texto). Filtros con `label`; la fila es un `<Link>`; el menú ⋯ accesible por teclado.

## 7. Móvil (≤640px)
- Resumen apilado; cursos como cards; acción primaria a ancho completo. Sheet a pantalla completa.

## 8. Decisiones y porqués
- **Acción contextual Tomar/Diseñar:** lleva a lo que el usuario hará según estado y rol.
- **"Aprobaciones del mes":** refleja el uso real de la capacitación.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
