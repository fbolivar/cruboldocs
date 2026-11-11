# Design Spec — Tablero configurable (`/app/tablero` · "Personalizar")

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/tablero/ARQUITECTURA.md (v1.3-3b) + ADR-068/069.

## 1. Propósito y protagonista
- **Qué logra:** que cada usuario muestre/oculte y reordene los bloques del tablero, y que su arreglo persista.
- **Protagonista:** el **tablero** (los bloques en el orden del usuario). La configuración es secundaria (un Sheet).
- **Roles:** la misma gate actual (`canSeeDashboard`); cada quien edita **su** preferencia.

## 2. Comportamiento del tablero
- El tablero renderiza los **bloques visibles en el orden guardado**; los ocultos no aparecen. Sin preferencia previa → **los 8 en el orden por defecto**.
- Los **filtros** actuales (proceso/año/norma), CSV e impresión del tablero **no cambian**.
- Si el usuario oculta todos los bloques: `EmptyState` "Tu tablero está vacío" + "Personalizar".

## 3. Sheet "Personalizar"
```
Personalizar tablero                                    [ Restablecer ]
┌──────────────────────────────────────────────┐
│ ☑ Mejora (KPIs)                        ↑  ↓   │
│ ☑ Desempeño (KPIs)                     ↑  ↓   │
│ ☐ Cliente (KPIs)                       ↑  ↓   │
│ ☑ No conformidades (panel)             ↑  ↓   │
│ …                                             │
└──────────────────────────────────────────────┘
                                   [ Guardar ]
```
- **Disparador:** botón "Personalizar" en el `PageHeader` del tablero (junto a los controles).
- **Lista de los 8 bloques** con su **nombre legible**; cada fila: **checkbox** (visible) + **↑ / ↓** (mover en el orden). El orden de la lista = el orden en que se pintarán.
- **↑** deshabilitado en el primero; **↓** en el último. Mover respeta a los ocultos (el orden es uno solo; la visibilidad es aparte).
- **"Restablecer":** vuelve al default (8 visibles, orden canónico) — en el formulario, se confirma al Guardar.
- **"Guardar":** persiste vía `setDashboardLayout` (lista de claves visibles en orden) → toast + `router.refresh()`; el tablero se repinta.
- **Cerrar sin guardar** descarta los cambios del Sheet.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | El tablero ya renderiza en servidor; el Sheet abre con la preferencia actual. |
| Sin preferencia | Default (8 visibles, orden canónico). |
| Tablero vacío (todo oculto) | `EmptyState` + "Personalizar". |
| Guardado | Toast "Tablero actualizado"; se cierra el Sheet; refresh. |
| Error | Toast con el mensaje; el Sheet queda abierto para reintentar. |

## 5. Accesibilidad
- Cada fila: `checkbox` con `label` asociado; botones ↑/↓ con `aria-label` ("Subir «Mejora»"). Operable por teclado. Estado (visible/oculto) no depende solo del color (checkbox + texto).

## 6. Móvil
- El Sheet a pantalla completa; filas a ancho completo con los controles a la derecha. El tablero ya es responsivo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Sheet, Button, Checkbox, Label | Reutilizados | |
| **CustomizeDashboardSheet** | Nuevo | lista de bloques + visibilidad + ↑/↓ + guardar/restablecer |
| **DashboardBlocks** (render ordenado) | Nuevo (refactor) | pinta los bloques existentes según el layout |

## 8. Decisiones
- **Un solo orden + visibilidad aparte:** mover un bloque no se complica por estar oculto; el modelo (lista de claves visibles) se deriva al guardar (orden de la lista filtrado por los marcados).
- **Botones ↑/↓** (ADR-069): sin dependencia y accesibles; suficiente para 8 bloques.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
