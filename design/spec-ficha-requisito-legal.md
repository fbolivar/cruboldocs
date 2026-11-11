# Design Spec — Ficha de requisito legal (`/app/requisitos-legales/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/requisitos-legales/ARQUITECTURA.md + ADR-041/042.

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** consultar el requisito y **evaluar su cumplimiento** periódicamente, con historial y evidencia.
- **Protagonista:** el **cumplimiento vigente** + el historial de **evaluaciones**.
- **Acciones según rol:** evaluar/editar/derogar = Líder SIG o Líder del proceso; ver = roles del SIG.

## 2. Wireframe textual (escritorio)

```
‹ Requisitos legales
REQ-2026-007  ⬒ Decreto         ● Parcial            [ Editar ] [ Derogar ]
Estándares mínimos SG-SST · Proceso SST · Reevaluar 2026-12-01 (en 21 días)

DATOS
Fuente Decreto · Ref. Dec. 1072/2015 art. 2.2.4.6 · Emite Mintrabajo
Qué exige: "Cumplir los estándares mínimos del SG-SST…"
Frecuencia anual · Enlace a la norma ↗

EVALUACIONES DE CUMPLIMIENTO                               [ + Evaluar ]
┌──────────────────────────────────────────────────────────────────────┐
│ 2026-06-01 · ● Parcial · por Coord. SST                                │
│ Evidencia: "Faltan 3 estándares; plan en curso."                       │
├──────────────────────────────────────────────────────────────────────┤
│ 2025-06-02 · ● No cumple · por Coord. SST                              │
└──────────────────────────────────────────────────────────────────────┘

TRAZABILIDAD
• 2026-06-01  Ana evaluó el requisito …
```

## 3. Secciones

- **Encabezado:** "‹ Requisitos legales"; **código** (`mono`), **chip de fuente**, **badge de cumplimiento vigente**, título, proceso, **próxima evaluación** (realce si vencida/≤30 días); acciones **"Editar"** y **"Derogar"** (si gestiona y vigente). Un requisito **derogado** muestra un badge neutro "Derogado" y queda en solo lectura.
- **Datos:** fuente, referencia, entidad emisora, **qué exige**, frecuencia, **URL** (enlace externo con `rel="noopener"`). Se editan en el Sheet "Editar".
- **Evaluaciones de cumplimiento:** historial (fecha, **badge de cumplimiento**, responsable; evidencia); **"+ Evaluar"** abre un Sheet (cumplimiento cumple/parcial/no cumple, evidencia/brecha, fecha). Al evaluar, se recalcula el **cumplimiento vigente** y la **próxima evaluación** (según frecuencia). Vacío: "Este requisito aún no se ha evaluado".
- **Trazabilidad:** `NcTimeline` con los eventos (creación, evaluaciones, edición, derogación).

## 4. Sheets

- **"Editar requisito":** título, fuente, referencia, emisora, qué exige, proceso, URL, frecuencia. "Guardar cambios" (solo vigente).
- **"Evaluar cumplimiento":** **cumplimiento** (Select cumple/parcial/no cumple, req), **evidencia/brecha** (textarea, req), **fecha de evaluación** (date, req, no futura), nota (opc). "Guardar evaluación".
- **"Derogar":** confirma ("El requisito dejará de contar en la matriz activa; se conserva el historial").

## 5. Comportamiento móvil (≤640px)

- Encabezado apilado; acciones a ancho completo.
- Secciones una debajo de otra; cada evaluación es una card a ancho completo.
- Sheets a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + datos + 2 filas de evaluaciones. |
| Vacío (sin evaluaciones) | `EmptyState` en la sección: "Este requisito aún no se ha evaluado" + "Evaluar" (si gestiona). |
| Derogado / solo lectura | Sin acciones de edición; se ve el historial y el badge "Derogado". |
| Solo lectura (no gestiona) | Sin acciones; ficha completa visible. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al guardar/evaluar/derogar; `router.refresh()`. |

## 7. Accesibilidad

- Cumplimiento **nunca por color solo** (badge con texto). URL externa con texto visible + ícono; `rel="noopener noreferrer"`.
- Campos con `label`; foco visible; confirmación en "Derogar".

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| ComplianceBadge, SourceChip | Nuevo (compartidos con la matriz) | |
| EditRequirementSheet, EvaluateRequirementSheet, DerogateButton, EvaluationRow | Nuevo | edición/evaluación/derogación |

## 9. Decisiones y porqués

- **Evaluación con evidencia obligatoria:** lo que exige el auditor (cómo se cumple o cuál es la brecha).
- **Cumplimiento vigente derivado + próxima evaluación recalculada** (ADR-041/042): coherente con Indicadores; sin estado suelto.
- **Derogar = baja lógica** (ADR-041): conserva la evidencia histórica.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
