# Design Spec — SG-SST: tablero de autoevaluación (`/app/sg-sst`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/sst/ARQUITECTURA.md + ADR-054/055.

## 1. Propósito y protagonista
- **Qué logra:** ver el **estado del SG-SST** según los Estándares Mínimos (Res. 0312): el **puntaje y la valoración** de la autoevaluación vigente, el historial, y crear una nueva autoevaluación.
- **Protagonista:** la **autoevaluación vigente con su puntaje + valoración** (el semáforo).
- **Roles:** ver = roles del SIG; crear/diligenciar/cerrar = Líder SIG (o Líder de proceso / responsable del SG-SST).

## 2. Wireframe (escritorio)
```
SG-SST · Estándares Mínimos (h1)                               [+ Nueva autoevaluación]
┌───────────────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Puntaje 2026   ●  84.5    │ │ Cumple    52  │ │ No cumple  6  │ │ Mejoras       │
│  Moderadamente aceptable   │ │ No aplica  2  │ │               │ │ abiertas  6 (2 venc.)│
└───────────────────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

AUTOEVALUACIONES
┌──────────────────────────────────────────────────────────────────────┐
│ SGSST-2026-001 · 2026 · Nivel 60 (51 trab., riesgo IV)  ■ 84.5 Moderado│  [ Abrir ]
│ SGSST-2025-001 · 2025 · Nivel 60                         ■ 71.0 Moderado│  [ Abrir ]
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + **"+ Nueva autoevaluación"** (si gestiona).
- **Resumen** (4 `StatCard`): **Puntaje** del período vigente con el **SstScoreGauge** (semáforo) y la **valoración**; **Cumple / No aplica**; **No cumple**; **Mejoras abiertas** (y cuántas **vencidas**). En móvil se apilan.
- **Historial de autoevaluaciones** (lista/cards): **código** (`mono`), **período**, **nivel** (7/21/60 con nº de trabajadores y clase de riesgo), **badge de valoración + puntaje**; fila clicable → ficha. Vacío: EmptyState.
- **Sheet "Nueva autoevaluación"** (gestiona): **Período/año** (number), **Nº de trabajadores** (number), **Clase de riesgo** (Select I–V). Al elegir, muestra en vivo **"Nivel aplicable: N estándares"** (7/21/60, calculado). Footer **"Crear y diligenciar"** → crea `SGSST-AAAA-###` en **borrador** y navega a la ficha.

## 4. Componentes nuevos
| Componente | Notas |
|---|---|
| **SstRatingBadge** | crítico→`error`, moderadamente aceptable→`advertencia`, aceptable→`exito` (con texto, nunca color solo). |
| **SstScoreGauge** | puntaje 0–100 + semáforo por umbral (alineado al ScoreMeter de proveedores / gauge de satisfacción). |
| **ItemStatusChip** | cumple→`exito`, no_cumple→`error`, no_aplica→`neutro`. |
| SstSummaryBar, SstBoard, NewEvaluationSheet | espejo de los tableros previos. |

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 tarjetas + filas de historial. |
| Vacío (sin autoevaluaciones) | `EmptyState` (ícono escudo/casco): "Aún no has hecho tu autoevaluación" + "Crear la primera" (si gestiona). |
| Error / Éxito | `SectionError` + reintentar; toast + navegación/`router.refresh()`. |

## 6. Accesibilidad
- Valoración **nunca por color solo** (badge con texto). El gauge muestra el **número**. Filtros/campos con `label`; la fila es un `<Link>`; "Clase de riesgo" como Select accesible.

## 7. Móvil (≤640px)
- Resumen apilado; historial como cards (código+valoración arriba, nivel/período al pie, "Abrir" a ancho completo). Sheet a pantalla completa.

## 8. Decisiones y porqués
- **El nivel se muestra al crear** (número de trabajadores + clase de riesgo → 7/21/60): el usuario entiende qué va a diligenciar y por qué, y evita evaluar estándares que no le aplican.
- **Puntaje con semáforo** como protagonista: es la métrica que el Ministerio y la ARL exigen comunicar.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
