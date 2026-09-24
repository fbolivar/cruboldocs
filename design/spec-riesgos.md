# Design Spec — Riesgos (`/app/riesgos`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver dónde se concentran los riesgos y si sus controles tienen evidencia al día (reemplaza la matriz en Excel).
- **Protagonista:** la **matriz de calor P×I 5×5**.
- **Acción primaria:** "Identificar riesgo" (Líder de proceso / Líder SIG). Para el Responsable de control: "Registrar evidencia" desde el panel.

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Riesgos (h1)                            [Exportar CSV] [+ Identificar riesgo] │
│ [Proceso ▾] [Categoría ▾] [Vista: ◉ Residual ○ Inherente]            │
│ ┌─ Matriz ───────────────────────────┐ ┌─ Resumen ──────────────────┐ │
│ │ IMPACTO →                          │ │ 42 riesgos                 │ │
│ │ P 5 │ 3  │ 1  │    │ 2  │ 1  │     │ │ ■ Extremo   3              │ │
│ │ R 4 │    │ 2  │ 4  │ 1  │    │     │ │ ■ Alto      9              │ │
│ │ O 3 │ 1  │ 5  │ 3  │ 2  │    │     │ │ ■ Moderado 17              │ │
│ │ B 2 │ 2  │ 4  │ 3  │    │    │     │ │ ■ Bajo     13              │ │
│ │ . 1 │ 1  │ 3  │ 2  │    │    │     │ │ Controles con evidencia    │ │
│ │       1    2    3    4    5        │ │ a tiempo: 81 %             │ │
│ └────────────────────────────────────┘ └────────────────────────────┘ │
│ [🔍 Código o descripción] [Nivel ▾] [☐ Controles vencidos]            │
│ ┌──────┬────────────────────────────┬──────────┬────────┬────────┬──────────┐
│ │Código│Descripción                 │Proceso   │Inherente│Residual│Controles │
│ │R-07  │Pérdida de información…     │TI        │■ Alto 16│■ Mod. 6│2 · ⚠1 venc.│
│ └──────┴────────────────────────────┴──────────┴────────┴────────┴──────────┘
└──────────────────────────────────────────────────────────────────────┘
          Panel lateral (?riesgo=R-07) → ver abajo
```

- **Filtros superiores:** Proceso, Categoría y el toggle **Residual / Inherente** (qué valoración pinta la matriz; por defecto Residual).
- **Matriz** (card, cuadrícula 5×5, celdas cuadradas 64px, `radio-sm`, gap 4): eje Y Probabilidad 5→1 y eje X Impacto 1→5 con rótulos `caption` y nombre del nivel en tooltip ("Probable", "Mayor"…). Color de celda = nivel (`riesgo-*`); número de riesgos en la celda (h3, color de texto del token). Celdas vacías: color del nivel al 25 % de opacidad, sin número. Clic en celda = filtra la lista (celda activa: borde 2px `texto`). Cada celda es un botón con `aria-label` "Probabilidad 4, impacto 3, nivel alto, 4 riesgos".
- **Resumen** (card lateral 280px): total, conteo por nivel (cuadro de color + **nombre** + cifra), % de controles con evidencia a tiempo.
- **Lista** (DataTable): Código (`mono`), Descripción (truncada a 1 línea), Proceso, Inherente (badge nivel + puntaje), Residual (badge), Controles (conteo + ⚠ vencidos en `error-texto`). Orden por nivel residual desc por defecto; también por Código y Proceso. Paginación 25. Clic → abre **panel lateral** (URL `?riesgo=id`).
- **Panel lateral del riesgo** (drawer 560px, `sombra-lg`):
  - Encabezado: código, descripción (h2), proceso, dueño (cargo), estado.
  - *Análisis*: causa, consecuencia, categoría.
  - *Valoración*: dos mini-cards Inherente / Residual (P, I, nivel con badge) + "Historial de valoraciones" (lista cronológica, nunca se sobrescribe) + botón "Nueva valoración" (Líder).
  - *Controles*: por control una card: descripción, tipo (chip), frecuencia, responsable (cargo), próxima ejecución (⚠ si vencida), última evidencia (resultado Efectivo `exito` / No efectivo `error`, fecha, adjunto). Botón "Registrar evidencia" (Responsable de control) y "Agregar control" (Líder).
  - **Formulario de evidencia** (dentro del panel, reemplaza la vista): Fecha de ejecución, Resultado (radio Efectivo / No efectivo), Observaciones, Archivo de soporte (opcional, 25 MB). Botón "Registrar evidencia". Aviso `small`: "Las evidencias no se pueden editar después de registrarse."
- **Formulario "Identificar riesgo"** (drawer, 3 secciones): *Identificación* (Proceso, Descripción, Causa, Consecuencia, Categoría, Cargo dueño) · *Valoración inherente* (selector P 1–5 y I 1–5 con su nombre; vista previa en vivo del nivel resultante como badge) · *Controles* (opcional, agregar uno o más). Botón "Guardar riesgo".

## 3. Comportamiento móvil (≤640px)

- Matriz arriba a ancho completo con celdas de 48px y ejes abreviados; resumen debajo como fila de 4 chips de nivel.
- Filtros en hoja inferior. Lista → cards: código + badge residual, descripción, "Proceso · 2 controles · 1 vencido".
- Panel lateral → pantalla completa con "‹ Riesgos".

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: cuadrícula 5×5 gris (`superficie-alt`) + 6 filas. |
| Vacío | Matriz con celdas vacías (se ve la escala) + mensaje "Aún no hay riesgos identificados." + "Identificar riesgo" (si tiene rol). |
| Vacío (filtros) | "Ningún riesgo coincide con estos filtros." + "Limpiar filtros". |
| Error | Por sección: matriz o lista con "No pudimos cargar los riesgos." + "Reintentar". Evidencia: errores inline ("Indica la fecha de ejecución"). |
| Éxito | Toast "Evidencia registrada para R-07" y la card del control se actualiza; "Riesgo R-43 creado" y se abre su panel. Exportar: `matriz-riesgos-AAAA-MM-DD.csv`. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| RiskHeatmap | Nuevo | Botones accesibles por celda |
| RiskLevelBadge | Nuevo | Color + nombre + puntaje |
| RiskSummary | Nuevo | |
| DataTable, FilterBar, Sheet | Reutilizados | |
| RiskPanel, ControlCard, EvidenceForm, AssessmentHistory | Nuevos | |
| ProbabilityImpactPicker | Nuevo | Vista previa del nivel |

## 6. Decisiones y porqués

- Toggle residual/inherente en vez de dos matrices: una sola visual protagonista.
- Nivel siempre con nombre: el color solo no es accesible ni suficiente para una auditoría.
- Panel lateral con URL: se comparte y se abre directamente desde la tarea de la bandeja.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
