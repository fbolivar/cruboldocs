# Design Spec — Calidad predictiva: Focos de riesgo

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/focos/ARQUITECTURA.md (v1.5-4) + ADR-112/113/114.

## 1. Propósito y protagonista
- **Qué logra:** concentrar en una vista lo que requiere atención, priorizado por severidad y accionable.
- **Protagonista:** la **lista de focos de severidad alta** en la parte superior.
- **Marco:** reusa el patrón de tablero (tarjetas/resumen + lista); cada foco es una tarjeta con enlace.

## 2. `/app/focos` — tablero de focos de riesgo
- **Encabezado:** "Focos de riesgo" + subtítulo "Señales calculadas de tus datos; revisa y actúa."
- **Barra de resumen (3 contadores):** Alta · Media · Baja (nº de focos por severidad).
- **Grupos por severidad** (Alta → Media → Baja), cada grupo una lista de **FocoCard**:
  - Ícono por categoría (vencimientos, indicador, NC, proveedor) + **punto de severidad** (rojo/ámbar/neutro).
  - **Título** (p. ej. "3 acciones CAPA vencidas") + **detalle** (p. ej. "Proceso Compras · la más antigua venció hace 12 días").
  - La tarjeta es un **enlace** a la entidad o a la lista filtrada (NC, indicadores, proveedor, bandeja).
- **Orden:** dentro de cada severidad, por cantidad/antigüedad (lo más urgente primero).

## 3. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de tarjetas. |
| Sin focos | EmptyState positivo: "Sin focos de riesgo ahora. Todo al día." (ícono de check). |
| Error de sección | Si una señal falla al calcular, su grupo degrada con un aviso; el resto se muestra. |
| Éxito | Focos agrupados por severidad con enlaces. |

## 4. Severidad y categorías (colores por token, nunca solo color)
- **Alta:** `error` (rojo) · **Media:** `advertencia` (ámbar) · **Baja:** `neutro`. Cada foco lleva además la etiqueta de severidad en texto.
- **Categorías:** Vencimientos (reloj), Indicador (gráfica), NC (clipboard), Proveedor (camión).

## 5. Accesibilidad / Móvil
- Severidad comunicada con texto + ícono, no solo color. Tarjetas como enlaces con foco visible. En móvil: una columna, tarjetas a ancho completo; contadores en fila.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, EmptyState, StatCard (contadores) | Reutilizados | |
| **FocosBoard** (resumen + grupos) | Nuevo | agrupa por severidad |
| **FocoCard** (ícono + severidad + título + detalle + enlace) | Nuevo | unidad de foco |

## 7. Decisiones
- **Priorizar por severidad** (ADR-114): lo alto arriba; el usuario actúa donde más duele.
- **Solo lectura con enlace** (ADR-113): el foco lleva a la entidad; no crea tareas ni avisos.
- **Vacío positivo:** "todo al día" refuerza el valor cuando no hay focos.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
