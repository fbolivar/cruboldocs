# Design Spec — Diseñador de formulario (`/app/formularios/[codigo]/disenar`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/formularios/ARQUITECTURA.md + ADR-046/047.

## 1. Propósito y protagonista
- **Qué logra:** **construir** la plantilla añadiendo, ordenando y configurando campos; **publicarla** para que se diligencie.
- **Protagonista:** la **lista de campos** en construcción (el lienzo).
- **Roles:** solo gestiona (Líder SIG / Líder del proceso). Solo editable en **borrador** (una publicada se edita creando una **nueva versión**, ADR-047).

## 2. Wireframe (escritorio) — dos columnas
```
‹ Formularios   Inspección de EPP  ◻ Borrador v1        [ Vista previa ] [ Publicar ]

┌─ Campos (lienzo) ───────────────────────┐   ┌─ Añadir campo ──────────────┐
│ ⠿ 1. ¿Usa casco? (Sí/No) *       [✎][🗑]│   │ [ Texto ] [ Texto largo ]   │
│ ⠿ 2. Observaciones (Texto largo) [✎][🗑]│   │ [ Número ] [ Fecha ]        │
│ ⠿ 3. Estado EPP (Selección) *    [✎][🗑]│   │ [ Sí/No ] [ Selección ]     │
│ ⠿ — Sección: "Evidencia" —       [✎][🗑]│   │ [ Multiselección ]          │
│ ⠿ 4. Puntaje de orden (0–100)    [✎][🗑]│   │ [ Puntaje ] [ Sección ]     │
│                                         │   └─────────────────────────────┘
│ (arrastra ⠿ para reordenar)             │
└─────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** "‹ Formularios"; título + estado/versión; **"Vista previa"** (abre el formulario en modo diligenciar, sin guardar) y **"Publicar"** (si hay ≥1 campo). Editar título/categoría/proceso/descripción → Sheet "Datos de la plantilla".
- **Lienzo (campos):** lista ordenada; cada ítem muestra el **nº, label, tipo** (y `*` si requerido); acciones **✎ editar**, **🗑 eliminar**, y **⠿** para **reordenar** (arrastrar en escritorio; botones ↑/↓ en móvil). Un campo **Sección** se ve como separador con su título.
- **Paleta "Añadir campo":** botones de los **9 tipos** (texto, texto largo, número, fecha, sí/no, selección, multiselección, puntaje, sección); al elegir uno, se agrega al final y abre su **editor**.
- **Editor de campo** (Sheet): **Etiqueta** (req), **Ayuda** (opc), **Requerido** (switch). Según el tipo:
  - *selección/multiselección:* editor de **opciones** (añadir/eliminar/reordenar textos).
  - *puntaje:* **mínimo/máximo** (p. ej. 0–100 o 1–5) y etiqueta.
  - *número:* mín/máx opcionales. *sección:* solo etiqueta (sin valor). Resto: sin config extra.

## 4. Publicar y versionar (ADR-047)
- **"Publicar"** confirma ("La plantilla quedará disponible para diligenciar y sus campos se congelan"). Estado → **Publicado**; el diseñador pasa a **solo lectura**.
- En una plantilla **publicada**, el encabezado muestra **"Nueva versión"** (en vez de Publicar): confirma y **clona** los campos en un **borrador vN+1** editable; la versión publicada sigue vigente hasta re-publicar. Las respuestas existentes conservan su versión.

## 5. Móvil (≤640px)
- Una sola columna: el lienzo arriba; la paleta "Añadir campo" como fila de chips desplazable o un botón "+ Añadir campo" que abre un selector de tipo. Reordenar con ↑/↓. Editor de campo a pantalla completa.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del lienzo + paleta. |
| Vacío (sin campos) | `EmptyState` en el lienzo: "Añade el primer campo" (desde la paleta). "Publicar" deshabilitado. |
| Publicado / solo lectura | Lienzo en solo lectura; CTA "Nueva versión"; aviso "Esta versión está publicada". |
| Error / Éxito | `SectionError` + reintentar; toast al guardar cada cambio (autosave por campo) + `router.refresh()`. |

## 7. Accesibilidad
- Reordenar operable por teclado (↑/↓ además del arrastre); cada campo del lienzo con rol y etiqueta; tipos de la paleta como botones con texto; el editor con `label` en todo campo; "Publicar" y "Nueva versión" confirman.

## 8. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Button, Input, Textarea, Switch, Select, Sheet, EmptyState, SectionError, Badge | Reutilizados | |
| **FieldPalette** | Nuevo | botones de los 9 tipos |
| **FieldList** + **FieldRow** | Nuevo | lienzo ordenable (arrastre + ↑/↓) |
| **FieldEditorSheet** | Nuevo | edita label/ayuda/requerido + config por tipo (opciones, min/max) |
| **OptionsEditor** | Nuevo | opciones de selección/multiselección (añadir/ordenar/eliminar) |
| PublishButton / NewVersionButton, TemplateDataSheet | Nuevo | publicar/versionar/editar datos |

## 9. Decisiones y porqués
- **Lienzo + paleta** (no drag desde una barra lateral compleja): simple, mobile-first; reordenar por arrastre con alternativa de teclado.
- **Autosave por campo** en borrador: evita perder trabajo; la publicación es el único paso explícito de "congelar".
- **Nueva versión por clonación** (ADR-047): protege la evidencia ya recolectada.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
