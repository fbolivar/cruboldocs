# Design Spec — SPC / Gráficas de control

**Producto:** CrubolDocs · **Fecha:** 2026-11-13 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/spc/ARQUITECTURA.md (v1.6-3) + ADR-121/122/123.

## 1. Propósito y protagonista
- **Qué logra:** ver la variación y capacidad de una característica medida en inspecciones, con señales de descontrol.
- **Protagonista:** **la carta de control (individuos)** con su línea central, límites y puntos; todo lo demás (MR, capacidad, señales) la acompaña.
- **Marco:** solo lectura, compute-only sobre `inspection_results` (patrón Focos). Gráfica SVG propia (como indicadores).

## 2. `/app/spc` — página única
- **Selector de característica** (arriba): lista de las características numéricas con ≥ N valores (nombre + plan + nº de puntos). Al elegir una, carga su análisis. Si no hay ninguna con datos suficientes → EmptyState "Aún no hay suficientes mediciones; registra inspecciones con características numéricas".
- **Carta de individuos (X):** SVG con eje de tiempo (inspecciones ordenadas), puntos conectados, **línea central** (X̄) y **UCL/LCL** punteados; los puntos en descontrol resaltados (color error + marca), con leyenda textual (no solo color).
- **Carta de rango móvil (MR):** SVG debajo, misma escala de tiempo, con MR̄ y UCL_MR.
- **Panel de capacidad:** Cp y Cpk en tarjetas, con el rango usado (LSL–USL) y X̄/σ̂; si no es calculable, "No calculable" + motivo (faltan límites o datos). Semáforo: Cpk ≥ 1.33 bien, 1.00–1.33 medio, < 1.00 bajo.
- **Señales de descontrol:** lista de violaciones (regla + punto/fecha): "Punto fuera de 3σ", "Racha de 8 del mismo lado", "Tendencia de 6". Si no hay → "Proceso bajo control (sin señales)".
- **Aviso de datos insuficientes:** si N < mínimo, se muestra la serie sin límites y un aviso.
- **Exportar CSV** de la serie (fecha, valor, MR, en/fuera de control).

## 3. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del selector y de la carta. |
| Vacío | Sin características con datos → EmptyState con guía a inspecciones. |
| Insuficiente | N < mínimo → serie sin límites + aviso. |
| Éxito | Carta + capacidad + señales. |
| Error | Mensaje humano + reintentar. |

## 4. Gráfica (SVG, tokens)
- Línea de datos en `acento`; línea central en `texto-sec`; UCL/LCL punteados en `borde-fuerte`; puntos en descontrol en `error`. Grilla tenue. `aria-label` con resumen (N, X̄, Cpk). Tooltip por punto (valor + fecha) opcional.
- **Nada de color como único signo:** los puntos en descontrol llevan además marca (aro) y aparecen en la lista de señales.

## 5. Accesibilidad / Móvil
- Selector y tarjetas apilan en móvil; la carta SVG usa `viewBox` y escala al ancho (scroll horizontal si hay muchos puntos). Capacidad y señales en una columna.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Select, EmptyState, SectionError, StatCard, Button | Reutilizados | |
| **SpcBoard** (selector + orquesta) | Nuevo | elige característica, pide el análisis |
| **ControlChart** (SVG individuos + MR) | Nuevo | líneas, límites, puntos en descontrol |
| **CapabilityPanel** (Cp/Cpk) | Nuevo | tarjetas + semáforo |
| **SignalList** (violaciones) | Nuevo | regla + punto |

## 7. Decisiones
- **I-MR, no X̄-R** (ADR-121): rotulado en la UI.
- **Cp/Cpk con el rango del plan** (ADR-122): se muestra el LSL–USL usado.
- **Solo lectura, reglas 3σ/racha 8/tendencia 6** (ADR-123): sin tareas ni alertas.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
