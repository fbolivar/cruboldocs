# Design Spec — Ficha de Indicador (`/app/indicadores/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/indicadores/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver la definición del KPI, su **tendencia** a lo largo de los periodos, capturar la medición del periodo y, si no cumple, abrir una NC con un clic.
- **Protagonista:** la **gráfica de tendencia** + la tabla de mediciones (el valor del seguimiento).
- **Acciones según rol:** editar/archivar la ficha = Líder SIG; registrar medición = Líder SIG **o** Líder del proceso dueño; generar NC desde una medición que no cumple = los mismos.

## 2. Wireframe textual (escritorio)

```
‹ Indicadores
┌──────────────────────────────────────────────────────────────────────┐
│ IND-2026-003 (mono)                                 [Editar] [Archivar]│
│ Cumplimiento de entregas a tiempo (h1)                                 │
│ ■ Cumple (nov-2026)   Proceso: SVC                                     │
│                                                                        │
│ ┌─ Definición ───────────────────────────────────────────────────────┐ │
│ │ Meta: ≥ 95 %   ·   Sentido: Mayor mejor   ·   Frecuencia: Mensual   │ │
│ │ Tolerancia: ±10 %   ·   Responsable: Líder de Servicios            │ │
│ │ Cálculo: entregas a tiempo / entregas totales × 100                │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Tendencia ────────────────────────────────────────────────────────┐ │
│ │   100┤               ● ●                                            │ │
│ │  meta┤----●----●----------●----  (línea de meta, punteada)          │ │
│ │    90┤  ●                                                           │ │
│ │      └ jul ago sep oct nov                                          │ │
│ │  (puntos coloreados por cumplimiento: verde/ámbar/rojo)             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Mediciones ───────────────────────────────  [+ Registrar medición]┐ │
│ │ Periodo    Valor    Cumplimiento   Nota            Capturó          │ │
│ │ nov-2026   97 %     ■ Cumple       —               L. Servicios     │ │
│ │ oct-2026   93 %     ▲ En riesgo    "paro logístico" L. Servicios    │ │
│ │ sep-2026   88 %     ✖ No cumple    "..."   [Generar NC] / →NC-2026-7│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Trazabilidad ─────────────────────────────────────────────────────┐ │
│ └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** código (`mono`), nombre (h1), **ComplianceBadge** del último periodo con el periodo entre paréntesis, proceso (chip). Acciones (solo Líder SIG): **Editar** (Sheet con los mismos campos de "Nuevo indicador", prellenados; el sentido/tasa editables con cuidado — nota "cambiar el sentido recalcula el cumplimiento de las mediciones" → en el MVP el recálculo NO es retroactivo; ver §7), **Archivar** (confirma; el indicador sale del tablero activo). Si está archivado: badge `neutro` "Archivado" + acción "Reactivar".
- **Definición** (card): meta formateada según sentido (`≥ 95 %`, `≤ 3 %`, `40–60 pts`), sentido (chip), frecuencia (chip), tolerancia (`±10 %`), responsable (nombre del cargo), y cálculo/descripción (texto; si vacío, "Sin fórmula registrada").
- **Tendencia** (card): **gráfica SVG** (§6). Si hay <2 mediciones: `EmptyState` compacto "Aún no hay suficientes mediciones para la tendencia".
- **Mediciones** (card con tabla/lista): columnas **Periodo** (etiqueta legible "nov-2026"), **Valor** (valor + unidad; si es tasa, tooltip/segunda línea "97/100"), **Cumplimiento** (ComplianceBadge), **Nota**, **Capturó** (persona). Orden: más reciente primero. Botón **"+ Registrar medición"** (Líder SIG o Líder del proceso): abre Sheet (§4). En una fila `no_cumple`: si no tiene NC, botón pequeño **"Generar NC"**; si ya tiene, enlace **→ NC-2026-007** (a su ficha).
- **Trazabilidad** (card, timeline read-only): creado, editado, mediciones registradas, NC generadas, archivado. Reutiliza `NcTimeline`.

## 4. Sheet "Registrar medición"

- **Periodo** (selector de periodo según la frecuencia del indicador: mes/trimestre/… — se muestra como lista de periodos recientes sin medición; por defecto el periodo vigente). Un periodo ya medido se puede **re-seleccionar para corregir** (upsert) con aviso "Ya hay una medición de este periodo; se reemplazará".
- Si el indicador **no es tasa**: **Valor** (number, req).
- Si **es tasa**: **Numerador** y **Denominador** (number, req; denominador ≠ 0). Debajo, vista previa del valor calculado y, al instante, el **cumplimiento estimado** (badge) comparando con la meta.
- **Nota** (textarea, opcional; obligatoria si el cumplimiento resulta `no_cumple` → ayuda a explicar la desviación).
- Footer: **"Guardar medición"** (loading). Al guardar: toast "Medición de nov-2026 registrada — Cumple/En riesgo/No cumple.", cierra y `router.refresh()`.

## 5. Comportamiento móvil (≤640px)

- Encabezado apila badge/metadatos; acciones Editar/Archivar en menú `⋮`.
- Cada sección es card a ancho completo. La **gráfica** se reescala al ancho (mantiene alto fijo ~160px; scroll horizontal solo si hay muchos periodos → se muestran los últimos N con "ver todos").
- La tabla de mediciones se vuelve lista de cards (periodo + badge arriba; valor, nota, capturó debajo; acción NC al pie).
- Sheets a pantalla completa.

## 6. Gráfica de tendencia (SVG propio, ADR-014)

- **Dimensiones:** alto fijo ~180px (desktop) / ~160px (móvil); ancho 100% del card.
- **Elementos:** eje X = periodos (etiquetas abreviadas); eje Y = valor (rango auto con padding). **Línea** de la serie en `acento` (2px). **Puntos** por medición coloreados por cumplimiento (`exito`/`advertencia`/`error`). **Línea de meta** punteada en `texto-sec`; para sentido **rango**, banda sombreada `exito-suave` entre meta y meta_max.
- **Interacción:** al pasar el cursor/enfocar un punto, tooltip con periodo, valor y cumplimiento (en móvil, toque). Sin dependencias de charts.
- **Accesibilidad:** `role="img"` + `aria-label` que resume la serie; la tabla de mediciones es la alternativa textual completa.
- **Estados:** <2 puntos → no se dibuja (mensaje en la sección). Error de datos → degrada a la tabla sin romper la página.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + 3 cards (definición, gráfica como bloque gris, tabla de 3 filas). |
| Vacío (sin mediciones) | Gráfica con mensaje; tabla con `EmptyState` "Aún no hay mediciones" + (si puede capturar) "Registrar medición". |
| Sin permiso de captura | Solo lectura; sin botones de registrar/editar/archivar/generar NC. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toasts: "Medición registrada — <estado>", "No conformidad NC-2026-007 generada" (aparece el enlace), "Indicador actualizado", "Indicador archivado". `router.refresh()`. |

## 8. Decisiones y porqués

- **Página completa con URL propia:** la ficha se comparte y se abre desde la tarea de captura; coherente con NC/Auditorías/Documentos.
- **Cumplimiento estimado en vivo en el Sheet de tasa:** el usuario ve si cumple **antes** de guardar — refuerza el valor de la medición.
- **Nota obligatoria si no cumple:** fuerza la explicación de la desviación (insumo para la NC y la revisión por la dirección).
- **Recálculo no retroactivo al editar la definición (MVP):** cambiar meta/sentido afecta solo las mediciones nuevas; el histórico conserva el cumplimiento con que se registró (evita reescribir evidencia pasada). Se documenta en la ficha y en el ADR; un "recálculo histórico" queda fuera del MVP.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| ComplianceBadge, Sparkline | Reutilizados de spec-indicadores | |
| NcTimeline (patrón) | Reutilizado | Trazabilidad |
| TrendChart | Nuevo | SVG puro (§6) |
| MeasurementTable, MeasurementSheet, EditIndicatorSheet, GenerateNcButton | Nuevos | GenerateNcButton reutiliza el patrón de Auditorías |

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
