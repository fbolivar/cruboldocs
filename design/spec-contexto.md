# Design Spec — Contexto de la organización (`/app/contexto`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 (Hex Core, solo modo claro) · **Arquitectura:** docs/contexto/ARQUITECTURA.md (v1.3-1) + ADR-060/061/062.

## 1. Propósito y protagonista
- **Qué logra:** documentar el **análisis de contexto** (DOFA + PESTEL, ISO 4.1) y las **partes interesadas** (4.2), y conectarlos con el SGC (generar riesgo, ligar a objetivo/requisito legal).
- **Protagonista:** la **matriz DOFA** (lo que define el contexto de la organización).
- **Roles:** ve = roles del SIG (`canSeeContext`); gestiona (crear/editar/archivar/generar riesgo) = Líder SIG o Líder del proceso (`canManageContext`).
- **Una ruta con 2 secciones** en `Tabs`: **Análisis de contexto** · **Partes interesadas**.

## 2. Wireframe (escritorio)
```
Contexto de la organización (h1)                         [+ Nueva cuestión]
┌ Resumen ───────────────────────────────────────────────────────────┐
│ Cuestiones 12 · Internas 5 · Externas 7 · Partes interesadas 8      │
└────────────────────────────────────────────────────────────────────┘
[ Análisis de contexto ]  [ Partes interesadas ]      ← Tabs

── Análisis de contexto ───────────────────────────────  [ Exportar CSV ]
[ Ámbito ▾ ] [ PESTEL ▾ ] [ Proceso ▾ ] [ Buscar… ]

  FORTALEZAS (interna)              DEBILIDADES (interna)
  ┌───────────────────────────┐    ┌───────────────────────────┐
  │ Equipo certificado   [⋯]  │    │ Alta rotación        [⋯]  │
  └───────────────────────────┘    └───────────────────────────┘
  OPORTUNIDADES (externa)           AMENAZAS (externa)
  ┌───────────────────────────┐    ┌───────────────────────────┐
  │ Nuevo nicho  ·Económico   │    │ Cambio normativo ·Legal   │
  │                     [⋯]   │    │ → Riesgo R-07   [Generar riesgo]
  └───────────────────────────┘    └───────────────────────────┘
```
Sección **Partes interesadas**:
```
── Partes interesadas ──────────────────────────────────  [ + Nueva parte ] [ CSV ]
[ Tipo ▾ ] [ Buscar… ]
┌────────────────────────────────────────────────────────────────────┐
│ ANLA        ·Autoridad    Requisito: licencia ambiental            │
│ Necesidades: cumplimiento · Seguimiento: trimestral   → RL-03  [⋯] │
├────────────────────────────────────────────────────────────────────┤
│ Clientes    ·Cliente      Requisito: calidad y plazo          [⋯]  │
└────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones y comportamiento
### 3.1 Análisis de contexto (DOFA + PESTEL)
- **Matriz de 4 cuadrantes** (`Card` por cuadrante): Fortalezas y Debilidades (internas), Oportunidades y Amenazas (externas). Cada cuestión es una fila con su descripción; las **externas** muestran un `Chip` **PESTEL** (Político/Económico/Social/Tecnológico/Ecológico/Legal).
- **Filtros (cliente):** Ámbito (interna/externa), PESTEL, Proceso, Buscar.
- **Sheet "Nueva cuestión / Editar":** **Tipo DOFA** (req), **PESTEL** (solo si es externa), **Descripción** (req), **Implicación** (opc), **Proceso** (opc), **Objetivo** (opc, ligar a un objetivo existente).
- **Generar riesgo** (menú ⋯ o botón en la tarjeta, solo gestor): abre confirmación → pide **proceso + responsable** (como `create_risk`) → crea el riesgo y la tarjeta muestra **"→ R-07"** enlazado. Si ya tiene riesgo, la acción se oculta.
- **Menú ⋯:** Editar · Generar riesgo (si no tiene) · Archivar/Restaurar.

### 3.2 Partes interesadas
- **Lista** (filas `Card`): nombre, `Chip` de **tipo**, **requisitos** (una línea), segunda línea `texto-sec`: necesidades · seguimiento · enlace a requisito legal (**→ RL-03**) si existe.
- **Filtros (cliente):** Tipo, Buscar.
- **Sheet "Nueva parte / Editar":** **Nombre** (req), **Tipo** (req), **Necesidades/expectativas** (opc), **Requisitos** (opc), **Seguimiento** (opc), **Proceso** (opc), **Requisito legal** (opc, ligar a uno existente). **Aviso de dato personal** si el nombre identifica a una persona.
- **Menú ⋯:** Editar · Archivar/Restaurar.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: barra de resumen + cuadrantes / filas. |
| Vacío (contexto) | `EmptyState` (ícono brújula): "Aún no has documentado el contexto" + "Agregar la primera cuestión" (si gestiona). |
| Vacío (partes) | `EmptyState`: "Sin partes interesadas" + "Agregar la primera". |
| Vacío por filtro | "Nada coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |
| Solo lectura (no gestiona) | Ve matriz y partes; sin "+", sin ⋯ de gestión, sin "Generar riesgo". |

## 5. Accesibilidad
- Ámbito/tipo nunca solo por color: `Chip` con texto. `Tabs` con roles ARIA (radix). Campos con `label`; el PESTEL se habilita solo cuando el tipo es externo (oportunidad/amenaza). Enlaces a riesgo/requisito legal son `<Link>` con texto.

## 6. Móvil (≤640px)
- Resumen apilado; los 4 cuadrantes en **una columna** (Fortalezas → Debilidades → Oportunidades → Amenazas); partes como cards a ancho completo; Sheets a pantalla completa; acción primaria a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Textarea, EmptyState, SectionError, DropdownMenu, Tabs | Reutilizados | |
| **SwotChip / PestelChip / PartyTypeChip** | Nuevo | etiquetas de clasificación |
| **ContextSummaryBar** | Nuevo | 4 conteos |
| **SwotMatrix** (4 cuadrantes) + **IssueCard** + **IssueSheet** | Nuevo | análisis de contexto |
| **GenerateRiskDialog** | Nuevo | proceso + responsable → `generate_risk_from_issue` |
| **PartiesList** + **PartySheet** | Nuevo | partes interesadas |

## 8. Decisiones y porqués
- **Matriz DOFA como protagonista:** es la forma en que las organizaciones piensan el contexto; PESTEL es una etiqueta sobre las externas, no un segundo formulario (evita sobrecarga — riesgo #1 de la arquitectura).
- **Generar riesgo con un clic:** materializa 4.1→6.1 reusando el motor de riesgos (ADR-061); el enlace visible (→ R-07) prueba la trazabilidad que auditan en el cap. 4.
- **Vínculos opcionales (objetivo / requisito legal):** conectan el contexto sin obligar; degradan con gracia si el destino se archiva.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
