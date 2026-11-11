# Design Spec — Tablero gerencial (`/app/tablero`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/dashboard/ARQUITECTURA.md · **Dataviz:** skill `dataviz` (color por función, nunca color solo).

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver el **estado del SGC** del periodo en una sola pantalla y **exportarlo** como evidencia (entrada a la Revisión por la dirección, 9.3).
- **Protagonista:** la **fila de KPIs de cabecera** (el "semáforo" del sistema de gestión). Las gráficas la explican.
- **Acciones según rol:** solo lectura. **Ver:** Líder SIG, auditor y dirección (gerente/aprobador); otros roles del SIG ven lo que su RLS ya permite (`canSeeDashboard`).

## 2. Wireframe textual (escritorio)

```
Tablero                                  [ Proceso ▾ ] [ Periodo ▾ ]   [ Imprimir / PDF ]

┌─ Mejora ──────────────┐ ┌─ Desempeño ───────────┐ ┌─ Cliente ─────────────┐
│ NC abiertas      7    │ │ Indicadores  82% ●Bien │ │ PQRS abiertas     5   │
│ NC vencidas      2 ▲  │ │ Auditorías (2026) 3    │ │ PQRS vencidas     1 ▲ │
│  ver no conformidades │ │ Objetivos  4 act·2 cmp │ │ Satisfacción 84 ●Bien │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
┌─ Documentos ──────────┐
│ Por vencer       4    │   (cada KPI enlaza "ver detalle" a su módulo)
└───────────────────────┘

┌─ No conformidades por estado y severidad ───┐  [CSV]   ┌─ Indicadores por cumplimiento ─┐ [CSV]
│ Abierta    ████████░░  8                    │          │ ██████ Cumple 12  ███ En riesgo│
│ En análisis ███ 3                           │          │ 4  ██ No cumple 2              │
│ Verificación ██ 2                           │          │ (barra apilada 100%, con cifras)│
│ Cerrada    ██████ 6                          │         └────────────────────────────────┘
│ ── severidad: Crítica 1 · Mayor 4 · Menor 7 │
└─────────────────────────────────────────────┘

┌─ Objetivos por perspectiva (BSC) ───────────┐ [CSV]   ┌─ PQRS y satisfacción ─────────┐ [CSV]
│ Financiera   ███████ 78%                    │          │ Abiertas 5 · Vencidas 1       │
│ Cliente      █████████ 90%                  │          │ Satisfacción (tendencia)      │
│ Procesos     — Sin datos                    │          │  72 · 78 · 84  ╱  (sparkline) │
│ Aprendizaje  █████ 55%                      │          │                               │
└─────────────────────────────────────────────┘         └───────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título `Tablero` (h1) + **filtros** y **"Imprimir / PDF"**. Filtros del lado cliente/servidor: **Proceso** (Select de procesos de la org + "Todos") y **Periodo** (Select: año en curso / año anterior / rango; por defecto año en curso). Al cambiar un filtro, los paneles se recargan (los agregados se aplican en servidor).
- **KPIs de cabecera** (tiles `StatTile`, agrupados por bloque): 
  - **Mejora:** NC abiertas, NC vencidas (realce `error` si >0).
  - **Desempeño:** % cumplimiento de indicadores (con semáforo), auditorías del periodo, objetivos (activos·cumplidos).
  - **Cliente:** PQRS abiertas, PQRS vencidas (realce), satisfacción último periodo (gauge).
  - **Documentos:** documentos por vencer.
  - Cada bloque es una `Card`; cada tile enlaza **"ver detalle"** a su módulo. En móvil los tiles se apilan (1 col), en `md` 2 col, en `lg` 3–4 col.
- **Paneles con gráficas** (`Card` con título + botón **"CSV"**):
  - **(a) NC por estado y severidad** — `HBar` (barras horizontales, etiqueta + valor) por estado; una línea secundaria con el desglose por severidad (Crítica/Mayor/Menor con su conteo).
  - **(b) Indicadores por cumplimiento** — `ComplianceBar` (barra apilada 100%: Cumple/En riesgo/No cumple con tonos `exito`/`advertencia`/`error` + cifras y etiquetas).
  - **(c) Objetivos por perspectiva BSC** — `PerspectiveBars`: 4 filas (las 4 perspectivas en orden fijo), cada una con su **avance** (barra coloreada por umbral igual que `ObjectiveProgress`, o "Sin datos").
  - **(d) PQRS y satisfacción** — conteo Abiertas/Vencidas + `Sparkline` de la satisfacción de los últimos periodos (línea simple con el último valor etiquetado).
- Orden en móvil: KPIs → (a) → (b) → (c) → (d), apilados a ancho completo.

## 4. Exportación (ADR-036)

- **"Imprimir / PDF"** (encabezado): `window.print()`. Hoja `@media print`: oculta el shell (menú lateral, topbar, barra inferior) y los botones de exportar/filtros; muestra un **encabezado de impresión** con **organización + periodo + proceso + fecha**; fondos y bordes suaves; evita cortes de panel a media gráfica (`break-inside: avoid`). Una vista limpia, lista para "Guardar como PDF".
- **"CSV"** por panel: usa `toCsv` (anti-inyección ya probada) → descarga `tablero-<panel>-<fecha>.csv` con los datos del panel (p. ej. NC: estado, conteo; indicadores: nombre, última medición, cumplimiento; objetivos: código, perspectiva, avance; PQRS: periodo, satisfacción).

## 5. Comportamiento móvil (≤640px)

- Filtros a ancho completo apilados; "Imprimir / PDF" a ancho completo.
- Tiles 1 col; bloques de KPIs apilados. Paneles a ancho completo; las barras horizontales mantienen etiqueta a la izquierda y valor a la derecha (no se truncan: el nombre hace `wrap`).
- Sparkline a ancho completo con alto fijo.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 bloques de tiles + 4 paneles con la misma geometría (sin layout shift). |
| Vacío (organización nueva) | Cada panel muestra su `EmptyState` ("Aún sin datos de no conformidades", etc.). Si **nada** tiene datos, un vacío global: "Aún no hay datos del SGC" + enlaces a configurar procesos/indicadores. Los KPIs muestran `0` / "—" (no error). |
| Error | `SectionError` **por panel** con "Reintentar": un panel que falla no tumba la página ni los demás. |
| Éxito | No hay mutaciones. La exportación da feedback (toast al CSV; el diálogo de impresión para PDF). |

## 7. Accesibilidad (y reglas dataviz)

- Contraste AA. **Ninguna gráfica comunica por color solo:** toda barra/segmento lleva **etiqueta + valor** (p. ej. "Cumple 12", "78%, Bien", "Sin datos"); el color es refuerzo.
- **Color por función** (no decorativo): semáforo/estado = `exito`/`advertencia`/`error` (reservados, con texto); magnitud simple = un solo tono de acento; "Sin datos" = `neutro`. No se usa una paleta categórica cíclica; las 4 perspectivas se distinguen por **etiqueta**, no por 4 colores (el color de su barra codifica el avance). Si el frontend introdujera una paleta categórica, debe validarla con `scripts/validate_palette.js` antes de usarla.
- Filtros con `label`; foco visible; cada panel tiene título (encabezado de `Card`) y los enlaces "ver detalle" son navegables por teclado. Existe la **vista en tabla** implícita vía la exportación CSV de cada panel (equivalente textual del dato).

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, EmptyState, SectionError, Select, Button | Reutilizados | |
| ScoreMeter, ObjectiveProgress, SatisfactionGauge | Reutilizados | % de indicadores, avance de objetivos, gauge de satisfacción |
| **StatTile** | Nuevo | tile de KPI: etiqueta (`caption`), número (`h2 tabular-nums`), realce opcional (`error`/`advertencia`), enlace "ver detalle". Encapsula el patrón ya usado en los summary bars. |
| **HBar** (BarList) | Nuevo | barras horizontales con etiqueta + valor; extremo redondeado 4px; un solo tono de acento; gap 2px. |
| **ComplianceBar** | Nuevo | barra apilada 100% Cumple/En riesgo/No cumple (`exito`/`advertencia`/`error`), con cifras y leyenda textual; ring 2px entre segmentos. |
| **PerspectiveBars** | Nuevo | 4 filas BSC (orden fijo), cada una con `ObjectiveProgress` (avance por umbral o "Sin datos"). |
| **Sparkline** | Nuevo | línea simple (2px) de la tendencia de satisfacción; último punto marcado (≥8px) y etiquetado; sin ejes densos. |
| **PrintHeader** | Nuevo | encabezado solo-impresión (org, periodo, proceso, fecha); oculto en pantalla. |

## 9. Decisiones y porqués

- **Una sola pantalla de lectura**, agrupada por bloque de SGC: responde "¿cómo va el sistema?" sin navegar 8 módulos.
- **Color por función y etiqueta siempre visible** (dataviz): el semáforo es `exito/advertencia/error`; la magnitud, un tono de acento; "Sin datos" nunca es 0%.
- **Exportación sin dependencias** (ADR-036): CSV (`toCsv`) + PDF por impresión con `@media print`.
- **Gráficas en SVG/CSS con tokens** (ADR-037): barras y sparkline simples, coherentes con `ScoreMeter`/`ObjectiveProgress`.
- **Degradación por panel:** cada panel carga y falla por su cuenta (robustez gerencial).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
