# Design Spec — SG-SST: ficha de autoevaluación (`/app/sg-sst/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/sst/ARQUITECTURA.md + ADR-054/055.

## 1. Propósito y protagonista
- **Qué logra:** **diligenciar** la autoevaluación (Cumple/No cumple/No aplica por estándar), ver el **puntaje y la valoración** en vivo, y formular el **plan de mejoramiento** de lo incumplido.
- **Protagonista:** la **lista de estándares con su cumplimiento** (el checklist), con el **puntaje** siempre visible.
- **Roles:** ver = roles del SIG; diligenciar/cerrar/gestionar el plan = Líder SIG (o Líder de proceso / responsable del SG-SST). Cerrada o sin gestión → **solo lectura**.

## 2. Wireframe (escritorio)
```
‹ SG-SST
SGSST-2026-001 · 2026 · Nivel 60 (51 trab., riesgo IV)   ■ Borrador   [ Exportar CSV ] [ Cerrar ]
Puntaje  ●───────────  84.5 / 100   Moderadamente aceptable

┌ I. PLANEAR — 25%  (22.5/25) ───────────────────────────────────────────┐
│ Recursos (10%)                                                          │
│  1.1.1 Responsable del SG-SST (0.5)        [ Cumple ][ No cumple ][ N/A ]│
│  1.1.2 Responsabilidades (0.5)             [ Cumple ][ No cumple ][ N/A ]│
│ Gestión integral del SG-SST (15%)                                       │
│  2.1.1 Política de SST (1)                 [✓ Cumple]                    │
│  …                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
┌ II. HACER — 60%  (… / 60) ▸  ┐  ┌ III. VERIFICAR — 5% ▸ ┐  ┌ IV. ACTUAR — 10% ▸ ┐

PLAN DE MEJORAMIENTO (6)                                       [ + Acción ]
┌──────────────────────────────────────────────────────────────────────┐
│ 4.2.6 Medición de la severidad de accidentes · Juan P. · vence 2026-12 │ ◷ Pendiente
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** "‹ SG-SST"; código, período, **nivel** (nº trabajadores, clase de riesgo), **badge de estado** (borrador/cerrada); acciones **"Exportar CSV"** y **"Cerrar"** (si gestiona y está en borrador). Debajo, el **SstScoreGauge** (puntaje + valoración), que **se actualiza** al marcar estándares.
- **Estándares por ciclo PHVA** (acordeón por fase I–IV; cada fase muestra su **peso** y su **puntaje obtenido/posible**). Dentro, subtítulos por **componente**; cada estándar: **código, nombre, peso** y un control de 3 opciones **Cumple / No cumple / No aplica** (radiogroup). Si **No aplica**, aparece un campo **justificación** (obligatorio). Solo se muestran los estándares **aplicables al nivel**. En el componente **"Peligros y riesgos"**, un enlace suave **"Ver matriz de peligros (GTC-45)"** → `/app/peligros`.
- **Plan de mejoramiento:** lista de acciones de los estándares **No cumple** (código+nombre del estándar, responsable, plazo con realce si vencido, estado). **"+ Acción"** abre un Sheet (estándar incumplido, descripción, responsable, plazo). Las acciones se marcan en curso/hecha/cancelada. Vacío: "Marca los estándares incumplidos y agrega acciones de mejora".
- (Opcional) **Trazabilidad** `NcTimeline` (creación, cierre).

## 4. Diligenciar y cerrar
- **Autosave por estándar** (como el diseñador de formularios): al elegir Cumple/No cumple/No aplica, se guarda y el **puntaje se recalcula en el servidor**; toast discreto + el gauge y el puntaje por fase se refrescan.
- **"Cerrar"** confirma ("La autoevaluación quedará en solo lectura con su puntaje y valoración del período"). Exige que **todos los estándares aplicables tengan respuesta**. Estado → **Cerrada**.

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + gauge + acordeón de fases. |
| Vacío (recién creada) | Las fases aparecen con los estándares **sin responder**; aviso "Diligencia cada estándar". |
| No aplica sin justificar | Error inline en el estándar; bloquea el cierre. |
| Solo lectura (cerrada o no gestiona) | Controles deshabilitados; se ve el resultado y el plan; sin acciones de gestión. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Accesibilidad
- Cada estándar es un `radiogroup` con `aria-checked`; la justificación se asocia con `aria-describedby`; el **puntaje por fase y total siempre visibles en número** (no color solo); la valoración con texto. Acordeón operable por teclado.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Textarea, Input, EmptyState, SectionError, NcTimeline | Reutilizados | |
| SstRatingBadge, SstScoreGauge, ItemStatusChip | Reutilizados (del tablero) | |
| **PhaseAccordion** + **StandardRow** | Nuevo | fases PHVA con su peso/puntaje; fila de estándar con el control de 3 opciones |
| **StandardStatusControl** | Nuevo | Cumple/No cumple/No aplica (+justificación) con autosave |
| **SstActionsPanel** + **SstActionSheet** | Nuevo | plan de mejoramiento (lista + alta/edición) |
| ExportSstCsvButton | Nuevo | una fila por estándar (código, nombre, fase, peso, estado) + resumen |

## 8. Decisiones y porqués
- **Agrupar por ciclo PHVA con peso y puntaje por fase:** es el lenguaje de la norma y del auditor; el usuario ve dónde pierde puntos.
- **Autosave + cálculo server-side:** el puntaje nunca se confía del cliente (ADR-054); el usuario ve el impacto inmediato de cada respuesta.
- **Plan de mejoramiento ligado al estándar incumplido:** conecta el hallazgo con la acción, como NC→acciones.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
