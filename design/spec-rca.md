# Design Spec — Causa raíz estructurada (5 Porqués / Ishikawa)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/rca/ARQUITECTURA.md (v1.5-2) + ADR-106/107/108.

## 1. Propósito y protagonista
- **Qué logra:** investigar la causa raíz de una NC con un método (5 Porqués o Ishikawa) y volcar la conclusión a la causa raíz.
- **Protagonista:** el **editor del método** dentro de la sección "Análisis de causa" de la ficha de NC.
- **Marco:** reusa el patrón de la ficha (sección con tarjeta, textarea, chips); el campo de causa raíz actual se mantiene.

## 2. Sección "Análisis de causa" (ficha de NC)
Debajo de la causa raíz actual, una tarjeta **"Análisis estructurado"** (visible a quien ve la NC; editable por quien la gestiona):
- **Selector de método** (dos pestañas/segmented): **5 Porqués** · **Ishikawa (6M)**. Cambiar de método sobre un análisis guardado advierte que se reemplaza.
- **Editor según método** (abajo).
- **Conclusión (causa raíz identificada):** textarea; se precarga con una sugerencia (último "porqué" o la causa marcada en Ishikawa) y es editable.
- Acciones: **Guardar análisis** y **"Usar como causa raíz"** (vuelca la conclusión al campo de causa de la NC; confirma si ya había causa).

### 2a. Editor 5 Porqués
```
Problema: (se precarga con el título/descr. de la NC, editable)
1. ¿Por qué? [ ___________________ ]
2. ¿Por qué? [ ___________________ ]
3. ¿Por qué? [ ___________________ ]   [+ Añadir porqué]  [– Quitar]
…
```
- Lista ordenada de pasos (mínimo 1, sugerido hasta 5, se pueden añadir/quitar). El último paso se sugiere como conclusión.

### 2b. Editor Ishikawa (6M)
```
Método      [+ causa]   · causa · causa
Máquina     [+ causa]   · causa
Mano de obra[+ causa]
Material    [+ causa]
Medio       [+ causa]
Medición    [+ causa]
```
- Seis categorías; en cada una, chips de causas (añadir/quitar texto corto). Junto a cada causa, un botón "marcar como raíz" que la propone como conclusión.

## 3. Estados
| Estado | Comportamiento |
|---|---|
| Sin análisis | Mensaje "Aún sin análisis estructurado" + botón "Analizar" (si gestiona). |
| Carga | La ficha trae el análisis; sin skeleton extra. |
| Editando | Editor del método; Guardar deshabilitado si está vacío. |
| Guardado | Toast "Análisis guardado"; se muestra el resumen del método. |
| Usar como causa raíz | Toast "Causa raíz actualizada"; la causa de la NC refleja la conclusión. |
| Solo lectura | Si no gestiona o la NC está cerrada/anulada: se ve el análisis sin editar. |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 4. Accesibilidad / Móvil
- Pestañas de método operables por teclado; cada campo con `label`. En móvil: categorías de Ishikawa apiladas, chips que envuelven, botones a ancho completo.

## 5. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Button, Input, Textarea, Chip, Tabs/Segmented | Reutilizados | |
| **RcaAnalysis** (contenedor: método + conclusión + acciones) | Nuevo | en la ficha de NC |
| **FiveWhysEditor** | Nuevo | cadena de porqués |
| **IshikawaEditor** | Nuevo | 6 categorías con causas |

## 6. Decisiones
- **La conclusión es la causa raíz** (ADR-106): "Usar como causa raíz" sincroniza con el campo existente.
- **Un análisis por NC** (ADR-108): cambiar de método reemplaza; se advierte.
- **Sin dibujo de espina** en v1: Ishikawa se representa por listas (claro y accesible).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
