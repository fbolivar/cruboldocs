# Design Spec — Multi-norma: catálogo, etiquetado y filtros (v1.1-4)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/multinorma/ARQUITECTURA.md + ADR-043/045.

## 1. Propósito y protagonista

- **Qué logra:** marcar el trabajo del SGC por **norma** (9001/14001/45001 y propias) y poder **filtrar/segmentar** por norma en los módulos y el Tablero.
- **Protagonista:** el **chip de norma** (lectura) y el **filtro "Norma"** en cada tablero.
- **Acciones según rol:** administrar el catálogo = Admin / Líder SIG; etiquetar = Líder SIG / Líder del proceso del registro; ver = roles del SIG.

## 2. Catálogo de normas — `/app/admin` (pestaña «Normas»)

- Lista de normas de la organización: código (9001/14001/45001/custom), nombre, estado (activa/inactiva), nº de registros etiquetados.
- **"Activar norma ISO"**: alta rápida de 9001/14001/45001 (sembrado). **"Nueva norma"**: código + nombre (para normas propias: BASC, NTC 6001…). **Desactivar** (baja lógica): deja de ofrecerse para etiquetar; conserva lo etiquetado.
- Estados: vacío ("Activa las normas de tu organización"); carga/erro­r estándar.

## 3. Etiquetado y filtros (integración módulo a módulo)

- **`NormChip`** (nuevo): chip pequeño con el código de norma (p. ej. "45001"), tono neutro; varios caben en línea. Se muestra en las **listas y fichas** de: procesos (catálogo/admin), documentos, riesgos, no conformidades, objetivos y requisitos legales.
- **Selector de normas** (`NormPicker`, multi-select) en los **Sheets de crear/editar** de esas entidades (cuando el usuario gestiona): marca/desmarca normas; guarda vía `entity_norms`. Si no hay normas activas, invita a activarlas en Admin.
- **Filtro "Norma"** (Select) en cada tablero (procesos/documentos/riesgos/NC/objetivos/requisitos): "Toda norma" + las activas; filtra del lado cliente/servidor según el módulo.
- **Tablero gerencial:** un **segmento "Norma"** en el encabezado (junto a Proceso/Periodo) que acota todos los paneles a los registros etiquetados con esa norma → "ver el SG-SST" o "ver 14001" de un vistazo.

## 4. Comportamiento móvil (≤640px)

- Chips de norma hacen *wrap* bajo el título; el `NormPicker` es una lista de checkboxes a ancho completo; el filtro "Norma" se apila con los demás filtros.

## 5. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton estándar en la pestaña Normas y en los selectores. |
| Vacío (sin normas activas) | Admin: EmptyState con "Activar norma ISO". En los Sheets: nota "Activa normas en Administración para etiquetar". |
| Error | `SectionError` + reintentar; en selectores, el guardado degrada solo esa acción. |
| Éxito | Toast al activar/crear/etiquetar; `router.refresh()`. |

## 6. Accesibilidad
- Chips con texto (código de norma), nunca color solo; multi-select con labels y estado marcado anunciado; filtros con `label`.

## 7. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Checkbox, EmptyState, Sheet | Reutilizados | |
| **NormChip** | Nuevo | código de norma (neutro), reutilizable en todas las listas/fichas |
| **NormPicker** | Nuevo | multi-select de normas activas para los Sheets de crear/editar |
| **NormFilter** | Nuevo | Select "Norma" para los tableros y el segmento del Tablero |
| NormasTab (admin) + ActivateNormSheet/NewNormSheet | Nuevo | gestión del catálogo |

## 8. Decisiones y porqués
- **Aditivo, módulo a módulo** (ADR-045): se despliega por partes para no arriesgar los módulos en producción.
- **Catálogo editable** (ADR-043): normas propias sin re-release.
- **Chip + filtro + segmento**: el etiquetado solo vale si se ve y se filtra; el Tablero gana la dimensión "norma".

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
