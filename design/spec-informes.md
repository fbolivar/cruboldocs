# Design Spec — Informes imprimibles (`/app/<módulo>/[codigo]/imprimir`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 (Hex Core, solo modo claro) · **Arquitectura:** docs/informes/ARQUITECTURA.md (v1.3-3a) + ADR-066/067.

## 1. Propósito y protagonista
- **Qué logra:** mostrar un informe **limpio e imprimible** (Revisión por la dirección, SG-SST, Indicadores, Caracterización de proceso) para guardarlo como PDF con el navegador.
- **Protagonista:** el **contenido del informe** (sin el marco de la app).
- **Roles:** la misma gate del módulo origen; si no hay acceso, `notFound()`.

## 2. Layout de impresión (común a los 4)
```
┌──────────────────────────────────────────────────────────────┐
│ [ ← Volver ]                                 [ Imprimir / PDF ]│  ← barra (print:hidden)
├──────────────────────────────────────────────────────────────┤
│ ◇ CrubolDocs · <Nombre de la organización>                    │
│ TÍTULO DEL INFORME                                             │
│ Código · Emitido: 2026-11-11 · Emitido por: <usuario>         │
│ ──────────────────────────────────────────────────────────── │
│                                                                │
│ (secciones del informe, una columna, tipografía del sistema)  │
│                                                                │
│ ──────────────────────────────────────────────────────────── │
│ CrubolDocs · documento generado el 2026-11-11            1/N   │  ← pie (print)
└──────────────────────────────────────────────────────────────┘
```
- **Barra superior** (`print:hidden`): "← Volver" (a la ficha) y "Imprimir / PDF" (`window.print()`).
- **Encabezado común (`ReportHeader`):** logo hex + nombre de la organización; **título** del informe; línea `texto-sec` con **código**, **fecha de emisión** y **emitido por**. Regla inferior.
- **Cuerpo:** una sola columna, ancho de impresión (contenedor `max-w` tipo A4), sin tarjetas con sombra (bordes sutiles), sin elementos interactivos.
- **Pie:** "CrubolDocs · generado el <fecha>" (vía `@media print` con contador de página si el navegador lo soporta).

## 3. Contenido por informe
- **Revisión por la dirección** (`getReview`): datos del acta (periodo, estado, fecha), **entradas** y **salidas/decisiones**, participantes y **firmas** (nombre, rol, fecha). Sin IP.
- **SG-SST** (`getSstEvaluation`): encabezado con **puntaje** y **valoración**; tabla de **estándares** por componente con su estado (cumple/no cumple/no aplica); **plan de mejora** (acciones).
- **Indicadores** (`listIndicators` + `getIndicatorSummary`): resumen del periodo (total, en meta, en riesgo) + **tabla** de indicadores (código, nombre, proceso, meta, última medición, cumplimiento).
- **Caracterización de proceso** (`getProcessDetail`): tipo y líder; **caracterización** (objetivo, alcance, entradas/proveedores, salidas/clientes, recursos, PHVA); **conteos** de lo ligado.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | No aplica relevante (server render); si tarda, skeleton mínimo del cuerpo. |
| Sin acceso / inexistente | `notFound()`. |
| Vacío (p. ej. sin plan de mejora) | La sección muestra "Sin registros" en vez de ocultarse (el informe debe ser completo). |
| Impresión | El marco de la app y la barra superior desaparecen (`print:hidden`); el cuerpo ocupa el ancho de página. |

## 5. Accesibilidad e impresión
- Contraste AA en pantalla y en impreso (texto oscuro sobre blanco). Estados por texto, no solo color (badges con etiqueta). `@media print`: colores forzados legibles, `break-inside: avoid` en filas de tabla y bloques de firma, márgenes de página con utilidades `print:`.

## 6. Móvil
- La vista es responsiva (una columna); "Imprimir / PDF" también funciona desde móvil (el navegador ofrece guardar/compartir como PDF).

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Badge, Chip, Table (ligera) | Reutilizados | |
| **PrintBar** | Nuevo | "Volver" + "Imprimir / PDF" (`print:hidden`) |
| **ReportHeader** | Nuevo | encabezado común (org, título, código, emisión) |
| **ReportSection** / **ReportTable** | Nuevo | secciones y tablas simples del informe |
| 4 vistas: ReviewReport, SstReport, IndicatorsReport, ProcessReport | Nuevo | arman el contenido desde los queries |

## 8. Decisiones y porqués
- **Impresión del navegador** (ADR-066): cero dependencias; el layout de una columna con el encabezado común da un informe serio y consistente.
- **Mismo gate del módulo:** no se amplía la superficie de seguridad; la vista solo re-presenta lo que el usuario ya puede ver.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
