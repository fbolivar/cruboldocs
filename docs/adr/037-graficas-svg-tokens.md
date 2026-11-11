# ADR-037 — Gráficas del tablero con SVG/CSS propio y tokens (sin librería)

## Contexto
El tablero necesita visualizaciones: barras (NC por estado/severidad, objetivos por perspectiva), semáforos (indicadores por cumplimiento) y una mini-tendencia (satisfacción). Se podría usar una librería (recharts, visx, Chart.js), pero añade dependencia y peso, y la regla invariable pide justificarla. El proyecto ya tiene primitivos de visualización propios (`ScoreMeter`, `ObjectiveProgress`, `SatisfactionGauge`) hechos con SVG/CSS y tokens Hex Core.

## Decisión
Las gráficas del MVP se construyen con **SVG/CSS propio y tokens**, siguiendo la skill `dataviz` (paleta de tokens con rol, contraste AA, nunca color solo: etiqueta + valor). Barras horizontales/verticales simples, semáforos y una línea/sparkline bastan para los paneles definidos. **No** se añade librería de gráficas en v1. Si más adelante se requiere una visualización que el SVG propio no cubra razonablemente (p. ej. series temporales densas e interactivas), se justifica **recharts** en una línea y se incorpora solo para ese caso.

## Consecuencias
- Cero dependencia, coherencia visual total con los medidores ya existentes, control del modo claro y de la accesibilidad.
- Más código propio para cada tipo de gráfica (aceptable: son formas simples y reutilizables).
- Si el tablero evoluciona a analítica rica, la librería entra de forma acotada sin reescribir lo simple.
