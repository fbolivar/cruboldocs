# Design Spec — BI / Constructor de informes

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/bi/ARQUITECTURA.md (v1.4-6) + ADR-097/098/099.

## 1. Propósito y protagonista
- **Qué logra:** armar un informe propio del SGC (elegir fuente, filtrar, agrupar) y guardarlo/compartirlo.
- **Protagonistas:** en la lista, **los informes guardados**; en el constructor, **el resultado (tabla + gráfica)** a la derecha del panel de configuración.
- **Marco:** reusa el patrón de tablero + ficha; sin lienzo libre (es un formulario de configuración + resultado).

## 2. `/app/informes` — lista
- **Lista** de informes guardados: nombre, dataset (chip), ámbito (badge **Compartida**/**Privada**), tipo de gráfica (ícono). Dos grupos o filtro: "Compartidos" y "Míos".
- **"Nuevo informe"** → `/app/informes/nuevo`.
- **Acción por fila:** abrir (ver/editar). Vacío: "Aún no tienes informes. Crea el primero."

## 3. `/app/informes/nuevo` y `/app/informes/[id]` — constructor/visor
Dos zonas (en móvil apiladas, en escritorio panel 1/3 + resultado 2/3):

**Panel de configuración:**
- **Fuente (dataset):** Select (No conformidades, Hallazgos, Mediciones, PQRS, Proveedores, Solicitudes). Al cambiar, se reinician columnas/filtros.
- **Columnas:** multiselección de las columnas del dataset (chips on/off).
- **Filtros:** lista de `campo · operador · valor`. Operadores según tipo: texto → *contiene/igual*; enum → *igual* (Select de valores); número → *igual/≥/≤*; fecha → *desde/hasta*. Botón "Agregar filtro".
- **Agrupar por:** Select (ninguno / un campo agrupable). Si hay agrupación → **Agregación:** conteo (por defecto) / suma / promedio (+ campo numérico).
- **Gráfica:** ninguna / barras / línea / torta (habilitada solo con agrupación).

**Resultado:**
- **Tabla:** detalle (columnas elegidas) o **agrupada** (grupo + valor agregado). Orden por una columna (clic en encabezado).
- **Gráfica:** barras/línea/torta según lo elegido, con leyenda y valores; en SVG. Si no hay agrupación, la gráfica se oculta con nota "Agrupa para ver una gráfica".
- **Acciones:** **Guardar** (nombre, descripción, ámbito Privada/Compartida —Compartida solo si eres Líder SIG), **Exportar CSV**, y en un informe guardado: **Eliminar** (autor/SIG).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de tabla/gráfica mientras corre el informe. |
| Vacío (sin filas) | EmptyState "Sin datos para estos filtros." |
| Sin configurar | Mensaje "Elige una fuente y columnas para empezar." |
| Ejecutando | La tabla/gráfica muestran estado de carga; el panel permanece usable. |
| Éxito al guardar | Toast + queda en la lista. |
| Error | Mensaje humano + reintentar; conserva la configuración. |

## 5. Accesibilidad / Móvil
- Gráficas con texto/valores además de color; tabla con encabezados `th` y orden accesible. En móvil, panel arriba y resultado abajo; tabla con scroll horizontal; chips de columnas envuelven.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Table, EmptyState | Reutilizados | |
| **ReportsList** | Nuevo | lista de informes guardados |
| **ReportBuilder** | Nuevo | panel de configuración |
| **FilterRow** | Nuevo | campo·operador·valor |
| **ReportTable** | Nuevo | detalle o agrupada, ordenable |
| **ReportChart** (barras/línea/torta en SVG) | Nuevo | se muestra con agrupación |
| **SaveReportSheet** | Nuevo | nombre, descripción, ámbito |

## 7. Decisiones
- **Config contra catálogo** (ADR-097): el panel solo ofrece columnas/operadores válidos del dataset.
- **Gráfica solo con agrupación**: una gráfica sin agregación no comunica; se exige agrupar.
- **Ámbito Compartida restringido** al Líder SIG; privada para cualquiera.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
