# Design Spec — Matriz de peligros SST (GTC-45) (`/app/peligros` + ficha)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/multinorma/ARQUITECTURA.md + ADR-044.

## 1. Propósito y protagonista

- **Qué logra:** levantar la **matriz de identificación de peligros y valoración de riesgos** de SST (ISO 45001 / Dec. 1072) con la metodología **GTC-45**.
- **Protagonista:** la **lista de peligros** con su **Nivel de Riesgo** (I–IV) calculado.
- **Acciones según rol:** crear/editar/valorar = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Metodología GTC-45 (valoración calculada en el servidor)

- **Nivel de Deficiencia (ND):** Muy alto 10 · Alto 6 · Medio 2 · Bajo 0.
- **Nivel de Exposición (NE):** Continua 4 · Frecuente 3 · Ocasional 2 · Esporádica 1.
- **Nivel de Probabilidad NP = ND × NE** (0–40) → Bajo / Medio / Alto / Muy Alto.
- **Nivel de Consecuencia (NC):** Mortal 100 · Muy grave 60 · Grave 25 · Leve 10.
- **Nivel de Riesgo NR = NP × NC** (0–4000) → **Nivel I** (4000–600, no aceptable), **II** (500–150, aceptable con control específico), **III** (120–40, mejorable), **IV** (20, aceptable).
- La UI captura ND/NE/NC con **Selects etiquetados**; el servidor calcula NP, NR y el Nivel (I–IV) + interpretación (no se confía del cliente). Un **`RiskLevelBadge`** muestra el nivel con tono: I→error, II→advertencia, III→info, IV→éxito (siempre con texto "Nivel I", etc.).

## 3. Tablero `/app/peligros`

```
Peligros SST (h1)                                 [ Exportar CSV ] [+ Nuevo peligro]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Peligros  18 │ │ Nivel I   3  │ │ Por revaluar      2  │
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Proceso ▾ ] [ Clasificación ▾ ] [ Nivel ▾ ]  [ Buscar… ]

┌──────────────────────────────────────────────────────────────────────┐
│ PEL-2026-004  Biomecánico      Movimiento repetitivo    ● Nivel II     │
│ Proceso Producción · Cargo Operario · NR 300                           │
├──────────────────────────────────────────────────────────────────────┤
│ PEL-2026-003  Físico           Ruido continuo           ● Nivel I      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Resumen** (3 StatCard): peligros activos, **Nivel I** (no aceptable, realce `error`), por revaluar.
- **Filtros:** proceso, **clasificación GTC-45** (físico/químico/biológico/biomecánico/psicosocial/condiciones de seguridad/fenómenos naturales), **nivel** (I–IV), buscar.
- **Lista:** código (`mono`), **clasificación** (chip), peligro (protagonista), **`RiskLevelBadge`**; segunda línea: proceso · cargo/área · "NR {valor}". Orden: Nivel I→IV; fila → ficha.
- **"Nuevo peligro"** (Sheet): proceso, área/cargo, **peligro** (descripción), **clasificación**, controles existentes (fuente/medio/individuo), **ND/NE/NC** (Selects con el semáforo de nivel en vivo), medidas de intervención, responsable (cargo). El NR se muestra calculado al elegir ND/NE/NC.

## 4. Ficha `/app/peligros/[codigo]`

- **Encabezado:** código, chip de clasificación, **`RiskLevelBadge`**, proceso/cargo; acciones Editar/Inactivar (baja lógica) según rol.
- **Valoración:** ND/NE/NC elegidos + **NP, NR y Nivel** calculados (con la interpretación GTC-45); un re-cálculo al editar.
- **Controles y medidas:** controles existentes (fuente/medio/individuo) y **medidas de intervención** (eliminación/sustitución/ingeniería/administrativos/EPP); responsable y estado.
- **Trazabilidad:** `NcTimeline`. (Diferido: peligro → acción/NC con un clic.)

## 5. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + filas / ficha con secciones. |
| Vacío | `EmptyState`: "Aún no hay peligros identificados" + "Nuevo peligro" (si gestiona). |
| Vacío por filtro | "Ningún peligro coincide" + limpiar. |
| Inactivo / solo lectura | Peligro inactivo atenuado; sin acciones si no gestiona. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Comportamiento móvil (≤640px)
- Resumen apilado; filtros a ancho completo; cada peligro como card (código+chip+badge arriba, proceso/cargo/NR al pie); Sheets a pantalla completa; los Selects ND/NE/NC apilados con el nivel calculado visible.

## 7. Accesibilidad
- Nivel de riesgo y clasificación **nunca por color solo** (badge/chip con texto: "Nivel I", "Físico"); Selects con `label`; el NR calculado se anuncia como texto.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| **RiskLevelBadge** | Nuevo | Nivel I→error, II→advertencia, III→info, IV→éxito (con texto) |
| **HazardClassChip** | Nuevo | clasificación GTC-45 (neutro) |
| **Gtc45Fields** | Nuevo | Selects ND/NE/NC + NP/NR/Nivel calculado en vivo (coincide con el servidor) |
| HazardsSummaryBar, HazardsBoard, NewHazardSheet, HazardManage | Nuevo | tablero/ficha/gestión |
| NormChip | Reutilizado (de spec-multinorma) | la matriz se etiqueta con 45001 |

## 9. Decisiones y porqués
- **Módulo propio GTC-45** (ADR-044): metodología distinta de los riesgos de calidad; el auditor de SST la espera así.
- **NR calculado en el servidor:** nunca confiado del cliente; la UI lo muestra en vivo para guiar, pero el valor oficial lo fija la base.
- **Baja lógica (inactivar):** conserva el histórico de la matriz.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
