# Design Spec — Crubol-Agent, copiloto de causa/CAPA/riesgos (Fase C)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/agente/ARQUITECTURA.md (Fase C) + ADR-051/052/053.

## 1. Propósito y protagonista
- **Qué logra:** desde la ficha de una **No Conformidad** o un **Riesgo**, pedir al agente que **sugiera** (y, con confirmación, **ejecute**) el análisis de causa y el plan CAPA (NC), o los controles y la valoración (riesgo).
- **Protagonista:** la **propuesta del agente y su tarjeta de confirmación** (la acción accionable), no el chat.
- **Roles/estado:** solo visible si el **agente está habilitado** para la organización (opt-in), el usuario **gestiona** esa NC/riesgo (`canManageNonconformities` / `canManageRisks`), y la sección es **editable** (NC no cerrada/anulada). Si no, el punto de entrada no aparece.

## 2. Puntos de entrada (en fichas existentes)
Botón discreto **"Sugerir con Crubol-Agent"** (ícono `Sparkles`, `variant="outline" size="sm"`) junto al título de cada sección:
- **Ficha NC** → secciones **Análisis de causa** y **Plan de acción**.
- **Ficha Riesgo** → secciones **Controles** y **Valoración**.

Cada botón abre el **panel del agente** (el `Sheet` ya existente) **sembrado** con: el intent de esa sección y el **contexto mínimo del registro** (armado en el servidor, sin PII del cliente). El usuario no escribe el prompt inicial; puede luego afinar por chat.

## 3. Wireframe (escritorio)
```
Ficha NC-2026-004 › Análisis de causa                 [ ✦ Sugerir con Crubol-Agent ]
┌───────────────────────────────────────────────┐   Panel (Sheet, derecha) ────────┐
│ (causa actual o vacío)                         │   ✦ Crubol-Agent     120/200 mes ✕│
└───────────────────────────────────────────────┘   ┌─────────────────────────────┐ │
                                                     │ Analizando esta NC… (stream)│ │
Ficha NC › Plan de acción          [ ✦ Sugerir ]     │ Causa probable: … (5 porqués)│ │
┌───────────────────────────────────────────────┐   ├─────────────────────────────┤ │
│ 1. Acción correctiva … (responsable, plazo)    │   │ ▸ PROPONE: Guardar causa    │ │
└───────────────────────────────────────────────┘   │   «Falta de verificación…»  │ │
                                                     │   [ Confirmar ] [ Cancelar ]│ │
                                                     │   [ Copiar al campo ]       │ │
                                                     ├─────────────────────────────┤ │
                                                     │ ▸ PROPONE: Acción CAPA      │ │
                                                     │   Corrección · resp · plazo │ │
                                                     │   [ Confirmar ] [ Cancelar ]│ │
                                                     │ [ escribe para afinar… ] ➤  │ │
                                                     └─────────────────────────────┘ │
```

## 4. Flujo
1. **Clic en "Sugerir"** → abre el panel; el servidor arma el contexto (registro abierto, minimizado) y el agente responde en **streaming**.
2. El agente entrega **texto** (la sugerencia explicada) y una o más **propuestas de escritura** (`tool_use`), cada una como **tarjeta de confirmación** con los datos exactos.
3. Por cada tarjeta: **"Confirmar"** ejecuta la **acción de dominio existente** (`setNcCause` / `addNcAction` / `addControl` / `addAssessment`) con la sesión del usuario (RLS) → toast + `router.refresh()` (la ficha se actualiza). **"Cancelar"** la descarta. Para la **causa** (texto), además **"Copiar al campo"** la pega en el editor sin ejecutar, para editar antes de guardar.
4. El usuario puede **afinar por chat** ("hazla más corta", "otra causa"); nada se escribe sin confirmación.

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Agente no habilitado | El botón **no aparece**; (en la cabecera del módulo, una nota opcional "Activa Crubol-Agent en Administración"). |
| Cargando/streaming | Encabezado "Analizando esta NC…"; texto en `aria-live="polite"`; las tarjetas aparecen cuando llegan. |
| Sin propuesta (solo texto) | Muestra la explicación y un aviso "No propuso cambios; puedes pedir más detalle". |
| Límite del mes alcanzado | Banner en el panel "Alcanzaste el límite del mes (N/N)"; sin ejecutar; CTA para contactar al administrador. |
| Error de red / backend | Mensaje humano + "Reintentar"; conserva la conversación. |
| Éxito (confirmó) | Toast ("Causa guardada" / "Acción agregada" / "Control agregado" / "Valoración registrada") + `router.refresh()`; la tarjeta pasa a estado **"Aplicado ✓"**. |

## 6. Privacidad (visible, para confianza)
- Línea fija al pie del panel: **"El agente solo lee este registro y no envía datos personales del cliente."** (coherente con ADR-051/053).
- Mientras el gate legal no cierre, el agente está **desactivado por defecto**; estas vistas solo se ven con el opt-in encendido.

## 7. Accesibilidad
- Botones "Sugerir" con `aria-label` ("Sugerir la causa con Crubol-Agent"); el panel es un diálogo (`Sheet`) con foco atrapado; región de respuesta `aria-live="polite"`.
- Tarjetas de confirmación operables por teclado; **nada se aplica automáticamente**; "Confirmar" nunca es el foco por defecto (evita ejecución accidental).
- Estado/acción nunca por color solo (texto "PROPONE" / "Aplicado ✓").

## 8. Móvil (≤640px)
- El botón "Sugerir" va a ancho completo bajo el título de la sección. El panel es un `Sheet` a **pantalla completa**; tarjetas y campo de chat apilados; acciones a ancho completo.

## 9. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Sheet, Button, Textarea, Card, Badge, toast | Reutilizados | |
| **AgentPanel** | Reutilizado/extendido | hoy en `/app/admin`; se parametriza con `seed` (contexto+intent) y el set de tools de la ficha |
| **SuggestAgentButton** | Nuevo | botón de sección que abre el panel sembrado (NC/Riesgo, sección) |
| **ToolProposalCard** | Extendido | tarjeta de confirmación por `tool_use`; añade "Copiar al campo" para la causa y estado "Aplicado ✓" |

## 10. Decisiones y porqués
- **Reusar el panel existente** (no una UI inline nueva): consistencia, streaming y chat de afinación con una sola superficie; el botón de sección solo lo **siembra**. *(Alternativa considerada: sugerencia inline sin chat; se descartó por perder el afinado y duplicar UI.)*
- **"Copiar al campo" solo para la causa** (texto libre): deja editar antes de guardar; las acciones CAPA/controles/valoración son estructuradas y van por tarjeta de confirmación.
- **El botón respeta estado y rol**: no aparece en NC cerradas ni para quien no gestiona → evita sugerir lo que no se podría guardar.
- **Privacidad visible**: la línea de minimización en el panel refuerza la confianza y es coherente con el gate legal.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
