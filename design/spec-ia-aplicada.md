# Design Spec — IA aplicada en el SGC ("Sugerir con IA")

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/ia/ARQUITECTURA.md (v1.5-1) + ADR-103/104/105.

## 1. Propósito y protagonista
- **Qué logra:** que el usuario obtenga un **borrador** de IA y lo use como punto de partida, siempre editable.
- **Protagonista:** el **borrador editable** (un textarea con el texto generado), no un chat.
- **Principio transversal:** patrón único **"Sugerir con IA"** reutilizado en los 4 puntos; la salida nunca se guarda sola.

## 2. Patrón "Sugerir con IA" (componente reutilizable)
Un botón discreto (ícono *sparkles* + "Sugerir con IA") junto al campo/sección correspondiente. Solo visible si el agente está habilitado y el usuario tiene el rol de la acción.
```
[ ✦ Sugerir con IA ]
```
Al pulsar:
- **Cargando:** el botón muestra spinner ("Generando…"); el resto del formulario sigue usable.
- **Resultado:** el texto cae en el **textarea editable** del campo (o en un panel para los resúmenes), con un rótulo discreto: **"✦ Borrador generado por IA — revísalo antes de guardar."** y, debajo, el cupo restante ("N usos de IA este mes").
- **Guardar:** con la **acción existente** (Guardar causa raíz, Agregar acción, Guardar documento). La IA no guarda nada.
- **Regenerar:** un enlace "Volver a sugerir" (consume otra unidad; lo advierte).

## 3. Los 4 puntos
| Punto | Dónde | Qué genera | Cómo se usa |
|---|---|---|---|
| Causa raíz de NC | Ficha de NC, sección Análisis (Sheet de causa raíz) | Borrador de causa raíz a partir de la descripción | Cae en el textarea de causa raíz; se guarda con la acción actual |
| Acciones de NC | Ficha de NC, al agregar acción | 1–3 acciones sugeridas (correción/correctiva) como texto | El usuario elige una, la edita y la agrega con el formulario de acción |
| Resumen de auditoría | Ficha de auditoría | Resumen ejecutivo de los hallazgos | Panel con el texto + **Copiar**; si hay campo de notas, botón **Guardar resumen** |
| Resumen de acta | Ficha de acta | Resumen de temas y compromisos | Igual que auditoría (Copiar / Guardar) |
| Borrador de documento | Alta/edición de documento (campo de contenido/observaciones) | Borrador de procedimiento/instructivo desde un prompt corto | Campo de prompt → textarea editable con el borrador |

## 4. Estados
| Estado | Comportamiento |
|---|---|
| No disponible | Si el agente no está habilitado o el usuario no tiene rol: el botón no aparece (no se deshabilita). |
| Cargando | Botón con spinner; formulario usable; sin bloquear la pantalla. |
| Éxito | Textarea/panel con el borrador + rótulo IA + cupo restante. |
| Sin cupo | Toast claro: "Alcanzaste el límite de IA de este mes."; el botón queda visible pero informa. |
| Error | Toast humano ("No pudimos generar el borrador, inténtalo de nuevo."); el formulario conserva lo escrito. |
| Vacío (contexto insuficiente) | Mensaje: "Agrega una descripción para que la IA pueda ayudarte." |

## 5. Accesibilidad / Móvil
- El botón tiene texto además del ícono; el rótulo de "borrador IA" es texto (no solo color). El textarea es el foco tras generar. En móvil, botón a ancho completo bajo el campo; panel de resumen a ancho completo con botón Copiar accesible.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Button, Textarea, Input, Sheet, Dialog, Toast | Reutilizados | |
| **SuggestWithAI** (botón + lógica de generación) | Nuevo | recibe `task` + contexto; devuelve texto al callback |
| **AiDraftBadge** (rótulo "Borrador generado por IA") | Nuevo | con el cupo restante |
| **AiSummaryPanel** (resumen con Copiar/Guardar) | Nuevo | auditoría/acta |

## 7. Decisiones
- **Un solo patrón** "Sugerir con IA" (ADR-103): coherencia y menos superficie.
- **Nunca auto-guarda** (ADR-104): la salida cae en un campo editable; guarda la acción humana.
- **Rótulo IA siempre visible** en el borrador: el usuario sabe que debe revisarlo.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
