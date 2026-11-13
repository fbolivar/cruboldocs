# Arquitectura — SPC / Gráficas de control (v1.6-3)

**Producto:** CrubolDocs · **Feature:** v1.6-3 · **Fecha:** 2026-11-13 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 9001 9.1 (análisis y evaluación) y el control estadístico de proceso piden ver **tendencia, variación y capacidad** de una característica medida, no solo aceptar/rechazar lotes. Es una brecha del mercado eQMS SMB.
- **Acción de valor:** el SIG elige una **característica numérica** ya medida en las inspecciones y ve su **carta de control** (puntos en el tiempo con límites calculados), las **señales de descontrol** (reglas) y la **capacidad del proceso** (Cp/Cpk) contra el rango del plan.
- **Reutiliza el dato existente:** `inspection_results` (v1.6-1) ya guarda, por cada inspección, el **valor numérico** de cada característica y su rango (`min_val`/`max_val`), con `inspections.inspected_at` como eje de tiempo. El SPC **lee y calcula al vuelo**: **sin tablas nuevas, sin captura nueva** (mismo enfoque que Focos v1.5-4).
- **Dato personal:** ninguno (mediciones técnicas de producto).

## 2. Modelo / técnica
- **Sin cambios de base de datos.** Motor de cálculo puro en `src/lib/spc/` + una query que agrega los valores existentes con RLS.
- **Serie:** para una característica (por su `name` dentro de un plan), tomar los `inspection_results` numéricos de las inspecciones de la organización, ordenados por `inspected_at` (y `created_at`), con su `value`, `min_val`, `max_val`.
- **Carta de individuos (I-MR)** (ADR-121): el modelo guarda **un valor por característica por inspección** (no subgrupos), así que la carta correcta es **Individuos + Rango móvil**:
  - Línea central X̄ = promedio de los valores; rango móvil MR_i = |x_i − x_{i-1}|; MR̄ = promedio de los MR.
  - Límites de individuos: `UCL = X̄ + 2.66·MR̄`, `LCL = X̄ − 2.66·MR̄`. Límites de rango móvil: `UCL_MR = 3.267·MR̄`, `LCL_MR = 0`.
- **Capacidad Cp/Cpk** (ADR-122): usa `min_val`/`max_val` del propio resultado como **LSL/USL** (ya es el criterio del plan). σ̂ = MR̄ / 1.128.
  - Bilateral: `Cp = (USL−LSL)/(6σ̂)`, `Cpk = min((USL−X̄)/3σ̂, (X̄−LSL)/3σ̂)`. Si solo hay un límite → solo el Cpk de ese lado. Si falta σ̂ o límites → "no calculable" (sin inventar).
- **Reglas de descontrol** (ADR-123, subconjunto Western Electric/Nelson): (1) punto fuera de ±3σ; (2) **racha** de 8 puntos seguidos del mismo lado de la línea central; (3) **tendencia** de 6 puntos consecutivos subiendo o bajando. Cada violación marca el/los puntos y su regla.
- **Mínimo de datos:** se exige un N mínimo (p. ej. **≥ 10** puntos) para dibujar límites; con menos, se muestra la serie con aviso "datos insuficientes para límites de control".
- **Gráfica:** SVG propia con tokens (reusa el patrón de indicadores ADR-014/037); sin librería de charts.

## 3. Alcance del MVP
| Feature | ¿v1.6-3? | Justificación |
|---|---|---|
| Carta de individuos (X) + rango móvil (MR) | **Sí** | Única correcta con 1 valor/inspección |
| Límites de control calculados del dato | **Sí** | Núcleo del SPC |
| Capacidad Cp/Cpk vs. rango del plan | **Sí** | Pregunta clave del auditor/cliente |
| Reglas de descontrol (fuera de 3σ, racha 8, tendencia 6) | **Sí** | Valor diferenciador, barato de calcular |
| Selección de característica con N suficiente | **Sí** | Entrada natural |
| Export CSV de la serie | **Sí** | Barato, reusa `toCsv` |
| Cartas X̄-R / X̄-s (subgrupos) | No | Exige capturar subgrupos en la inspección (diferido) |
| Cartas de atributos (p, np, c, u) | No | Otro tipo de dato; diferido |
| Histograma / prueba de normalidad | No | Diferido |
| Alertas/tareas automáticas por descontrol | No | Solo lectura en v1 (como Focos) |
| Límites fijados a mano / fases | No | Límites calculados del dato en v1 |

**Camino dorado:** el SIG abre **SPC**, elige la característica "Diámetro" del plan "Recepción de materia prima" → ve la carta de individuos con su línea central y límites, un punto marcado por **regla fuera de 3σ**, y abajo **Cp/Cpk** contra el rango 9.8–10.2 mm → decide intervenir el proceso.

## 4. Mapa de rutas
- **`/app/spc`** — selector de característica (las que tienen ≥ N valores numéricos) + la carta de control activa (individuos + MR), la lista de señales de descontrol y el panel de capacidad (Cp/Cpk). Export CSV de la serie.
- Nav **SPC** (ícono tipo `ActivitySquare`/`ChartSpline`). Visible a roles SIG (`canSeeSpc` = RISK_ROLES; es solo lectura, sin "gestionar").

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Aislamiento entre organizaciones** → la query lee `inspection_results`/`inspections` con RLS por `organization_id` (sin SQL nuevo ni RPC); no hay tablas ni endpoints nuevos (como Focos).
2. **Estadística engañosa con pocos datos** → N mínimo para dibujar límites; con menos, se muestra la serie y un aviso explícito; Cp/Cpk "no calculable" si falta σ̂ o límites, sin inventar números.
3. **Confusión de tipo de carta** → se documenta que es **I-MR** (individuos), no X̄-R; la UI lo rotula. X̄-R queda diferido hasta capturar subgrupos.

## ADRs

### ADR-121 — Carta de individuos (I-MR), no X̄-R
**Contexto:** `inspection_results` guarda un valor por característica por inspección, no subgrupos.
**Decisión:** la carta del MVP es **Individuos + Rango móvil**, con límites `X̄ ± 2.66·MR̄` y `UCL_MR = 3.267·MR̄`.
**Consecuencias:** correcta para el dato actual; X̄-R/X̄-s quedan diferidos hasta capturar subgrupos en la inspección.

### ADR-122 — Cp/Cpk con el rango del plan como especificación
**Contexto:** la capacidad necesita límites de especificación (LSL/USL).
**Decisión:** usar `min_val`/`max_val` del resultado (criterio del plan) como LSL/USL; σ̂ = MR̄/1.128; "no calculable" si faltan datos.
**Consecuencias:** capacidad sin captura extra; coherente con el criterio que ya se inspecciona.

### ADR-123 — SPC solo lectura, compute-only (sin tablas, sin alertas)
**Contexto:** no duplicar datos ni crear ruido de tareas en v1.
**Decisión:** el SPC calcula al vuelo sobre `inspection_results` con RLS (patrón Focos); un subconjunto de reglas (3σ, racha 8, tendencia 6); sin tablas, sin tareas, sin cron.
**Consecuencias:** cero migraciones y mínimo riesgo; alertas automáticas por descontrol quedan diferidas.

---

## Decisiones que necesito de ti (para fijar el alcance)
1. **Carta de individuos (I-MR)** por el modelo de un valor/inspección; X̄-R diferido. *Recomiendo sí.*
2. **Compute-only sobre `inspection_results`, sin tablas ni captura nuevas** (como Focos). *Recomiendo sí.*
3. **Cp/Cpk con el rango del plan como LSL/USL.** *Recomiendo sí.*
4. **Reglas:** fuera de 3σ + racha de 8 + tendencia de 6 (resto diferido). *Recomiendo sí.*
5. **N mínimo ≈ 10** para dibujar límites; con menos, aviso. *Recomiendo sí.*
6. **Ruta `/app/spc`, roles SIG, solo lectura.** *Recomiendo sí.*
7. **Fuera del MVP:** X̄-R/subgrupos, cartas de atributos, histograma/normalidad, alertas automáticas. ¿De acuerdo?

**Siguiente:** tu aprobación (PARADA) → **diseño** (selector + carta SVG + capacidad + señales). Luego frontend/datos, seguridad, deploy.
