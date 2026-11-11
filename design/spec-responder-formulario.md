# Design Spec — Diligenciar formulario (`/app/formularios/[codigo]/responder`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/formularios/ARQUITECTURA.md + ADR-046/048.

## 1. Propósito y protagonista
- **Qué logra:** **diligenciar** una plantilla **publicada** (interno, con sesión) y enviarla.
- **Protagonista:** el **cuerpo del formulario** (los campos a responder).
- **Roles:** cualquier **miembro activo** de la organización; la respuesta guarda `submitted_by` y la **versión** de la plantilla.

## 2. Wireframe (escritorio)
```
‹ Formularios   Inspección de EPP  (v2)

┌──────────────────────────────────────────────┐
│ ¿Usa casco? *            [ Sí ] [ No ]        │   (si_no)
│ Estado EPP *             [ Select ▾ ]         │   (seleccion)
│ Riesgos observados       ☐ Caídas ☐ Cortes…   │   (multiseleccion)
│ ── Evidencia ──                               │   (seccion = encabezado)
│ Observaciones            [ textarea ]         │   (texto_largo)
│ Puntaje de orden (0–100) [ ──●─── ] 80        │   (puntaje)
│ Fecha de inspección      [ date ]             │   (fecha)
│                                               │
│ [ Guardar borrador ]            [ Enviar ]    │
└──────────────────────────────────────────────┘
```

## 3. Secciones y render por tipo
Render **dinámico** desde el esquema de la versión; cada campo con su `label` (+ `*` si requerido) y `ayuda`:
- **texto** → input; **texto_largo** → textarea; **número** → input numérico (respeta mín/máx); **fecha** → date.
- **sí_no** → dos botones (radiogroup); **selección** → Select/radios; **multiselección** → checkboxes.
- **puntaje** → control según min/max (slider 0–100 o botones), valor visible.
- **sección** → encabezado/separador (no es campo de dato).
- **"Guardar borrador"** (crea/actualiza `form_submission` en estado *borrador* del usuario) y **"Enviar"** (valida requeridos → estado *enviada*). La **validación** de tipos/requeridos/opciones/cotas se hace **en el servidor** contra el esquema de la versión; el cliente valida en vivo para guiar.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del cuerpo. |
| Plantilla no publicada / inexistente | Mensaje neutro: "Este formulario no está disponible para diligenciar". |
| Validación | Errores inline por campo (requerido, rango, opción no válida); al enviar, enfoca el primero con error. |
| Éxito | Pantalla/toast "Respuesta enviada" + enlace "Responder otra" / volver a la lista. |
| Error de red | Mensaje + reintentar; conserva lo capturado (borrador local hasta guardar). |

## 5. Móvil (≤640px)
- Una columna a ancho completo; controles grandes (botones sí/no, checkboxes, slider) táctiles; "Guardar borrador"/"Enviar" fijos al pie del flujo.

## 6. Accesibilidad
- Cada control con `label` asociado y `aria-required`; sí/no y puntaje como `radiogroup` con `aria-checked`; el valor del puntaje siempre visible (no color solo); errores asociados al campo con `aria-describedby`.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Button, Input, Textarea, Select, Checkbox, Label, EmptyState | Reutilizados | |
| **FieldRenderer** | Nuevo | renderiza un campo según su tipo (reusable en Vista previa del diseñador) |
| **SubmissionForm** | Nuevo | compone los FieldRenderer + guardar borrador/enviar + validación en vivo |
| ScoreInput | Reutilizado (de la encuesta) o variante | control de puntaje por min/max |

## 8. Decisiones y porqués
- **Render dinámico desde el esquema** (ADR-046): un solo renderizador cubre cualquier plantilla; se reutiliza en "Vista previa" del diseñador.
- **Validación server-side** contra la versión: la integridad no se confía del cliente; el valor se guarda tipado (jsonb).
- **Guardar borrador:** permite diligenciar en varias sesiones (inspecciones largas).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
