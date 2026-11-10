# ADR-014 — Gráfica de tendencia con SVG propio (sin librería de charts)

## Contexto
La ficha del indicador muestra la tendencia de sus mediciones a lo largo de los periodos — es el núcleo
del diferenciador de reportería. Hay dos caminos: agregar una librería de charts (Recharts, Chart.js,
visx…) o dibujar la serie con SVG propio. El proyecto es sobrio con las dependencias (regla invariable:
sin dependencias nuevas sin justificación) y usa solo modo claro con tokens Hex Core.

## Decisión
La tendencia se dibuja con **SVG propio** (una línea, puntos por medición, banda/fila de la meta y
color del punto según `compliance`), sin librería de charts. La serie ya viene ordenada por periodo
desde la capa de datos; el componente es de presentación pura. Si en el futuro se piden gráficas ricas
(zoom, múltiples series, tooltips avanzados, exportación de imagen), se evaluará una librería entonces.

## Consecuencias
- Cero dependencias nuevas; control total del estilo con los tokens (coherencia visual).
- Suficiente para una tendencia de pocas decenas de puntos (lo normal en KPIs periódicos).
- Si crecen los requisitos de visualización, habrá que reescribir el componente sobre una librería;
  el costo es bajo porque queda aislado como componente de presentación.
