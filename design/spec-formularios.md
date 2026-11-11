# Design Spec — Formularios: lista de plantillas (`/app/formularios`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/formularios/ARQUITECTURA.md + ADR-046/047/048.

## 1. Propósito y protagonista
- **Qué logra:** ver las **plantillas** de formulario de la organización, crear una nueva, y entrar a diseñarla, diligenciarla o ver sus respuestas.
- **Protagonista:** la **lista de plantillas** con su estado (Borrador / Publicado / Archivado) y su nº de respuestas.
- **Roles:** crear/editar/publicar = Líder SIG o Líder del proceso (`can_manage_forms`); **diligenciar** = cualquier miembro activo; ver = roles del SIG.

## 2. Wireframe (escritorio)
```
Formularios (h1)                                             [+ Nueva plantilla]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Plantillas 7 │ │ Publicadas  4│ │ Respuestas (mes)  38 │
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Categoría ▾ ] [ Estado ▾ ] [ Proceso ▾ ]  [ Buscar… ]

┌──────────────────────────────────────────────────────────────────────┐
│ FORM-2026-003  ⬒ Inspección   Inspección de EPP        ■ Publicado v2 │
│ Proceso SST · 12 campos · 24 respuestas          [ Diligenciar ] [ ⋯ ]│
├──────────────────────────────────────────────────────────────────────┤
│ FORM-2026-002  ⬒ Lista verif. Orden y aseo            ◻ Borrador v1   │
│ Proceso Producción · 8 campos · 0 respuestas         [ Diseñar ] [ ⋯ ]│
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + **"+ Nueva plantilla"** (si gestiona).
- **Resumen** (3 `StatCard`): plantillas totales, **publicadas**, **respuestas del mes** (suma de `form_submissions` enviadas del periodo). En móvil se apilan.
- **Filtros** (lado cliente): **Categoría** (inspección/lista de verificación/formato/encuesta interna/otro), **Estado** (borrador/publicado/archivado), **Proceso**, **Buscar** (código o título). "Limpiar filtros".
- **Lista** (cards/filas): **código** (`mono`), **chip de categoría**, **título** (protagonista), **badge de estado** + versión (`v2`); segunda línea `texto-sec`: proceso · "N campos" · "M respuestas". Acción primaria contextual: **"Diligenciar"** si publicada; **"Diseñar"** si borrador (y si gestiona); un menú **⋯** (ver ficha/respuestas, duplicar, publicar/archivar, nueva versión). Fila clicable → ficha. Archivadas atenuadas y ocultas por defecto (toggle "Mostrar archivadas").

## 4. Sheet "Nueva plantilla" (gestiona)
Campos: **Título** (text, req), **Categoría** (Select, req), **Proceso** (Select, opc), **Descripción** (textarea, opc). Footer **"Crear y diseñar"** → crea `FORM-AAAA-###` en **borrador v1** y navega al **diseñador**.

## 5. Móvil (≤640px)
- Resumen apilado; filtros a ancho completo; cada plantilla como card (código+chip+badge arriba, metadatos al pie, acción primaria a ancho completo, ⋯ al lado). Sheet a pantalla completa.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas. |
| Vacío (sin plantillas) | `EmptyState` (ícono formulario): "Aún no tienes plantillas" + "Crea la primera" (si gestiona). |
| Vacío por filtro | "Ninguna plantilla coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/`router.refresh()`. |

## 7. Accesibilidad
- Estado/categoría **nunca por color solo** (badge/chip con texto). Filtros con `label`; la fila es un `<Link>`; el menú ⋯ es un `DropdownMenu` accesible por teclado.

## 8. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, DropdownMenu | Reutilizados | |
| **FormStatusBadge** | Nuevo | borrador→advertencia, publicado→exito, archivado→neutro (+ "vN") |
| **FormCategoryChip** | Nuevo | inspección/lista de verificación/formato/encuesta interna/otro |
| FormsSummaryBar, FormsBoard, NewTemplateSheet, TemplateRowMenu | Nuevo | espejo de los tableros previos |

## 9. Decisiones y porqués
- **Acción primaria contextual** (Diligenciar vs. Diseñar): lleva al usuario a lo que de verdad hará con esa plantilla según su estado y rol.
- **Archivadas ocultas con toggle:** conservan historial sin ensuciar la lista activa.
- **"Respuestas del mes"** como métrica: refleja el uso real del constructor.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
