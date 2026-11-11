# Design Spec — Campo de foto en formularios (inspecciones móviles)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pwa-foto/ARQUITECTURA.md (v1.3-4) + ADR-070/071/072.

## 1. Propósito y protagonista
- **Qué logra:** adjuntar **fotos** a un formulario (también offline), con la cámara del celular.
- **Protagonista:** la **foto capturada** (la evidencia).
- **Roles:** diseñar el campo = Líder SIG / Líder del proceso; diligenciar = cualquier miembro activo; ver respuestas = roles del SIG.
- **Tres toques:** (A) diseñador, (B) diligenciar, (C) ver la respuesta. Sin rutas nuevas (todo en Formularios).

## 2. (A) Diseñador — nuevo tipo "Imagen"
- En la **paleta** de campos aparece **"Imagen"** (ícono cámara), tras "Puntaje".
- Config del campo (igual que los demás, en su editor): **Etiqueta**, **Ayuda**, **Requerido**, y **Máx. de fotos** (número 1–10, def. 3).
- En la estructura/preview el campo se muestra como "Imagen · hasta N fotos".

## 3. (B) Diligenciar — captura y galería
```
EPP en buen estado *                              (hasta 3 fotos)
┌──────┐ ┌──────┐ ┌─────────────┐
│ img  │ │ img  │ │  + Tomar /   │
│  ✕   │ │  ✕   │ │   Subir foto │
└──────┘ └──────┘ └─────────────┘
Subiendo 1 de 2…   /   ⚠ 1 pendiente de subir (se enviará al reconectar)
```
- Control del campo (`PhotoField`): **miniaturas** de las fotos agregadas (cuadradas, con **✕** para quitar) + un botón **"Tomar / Subir foto"** que abre `input type=file accept="image/*" capture="environment"` (cámara trasera en móvil; galería en escritorio). Deshabilita "Agregar" al llegar al **máx**.
- **Al elegir una foto:** se **comprime en el cliente** (canvas) → miniatura inmediata (preview local) →
  - **En línea:** se **sube** a Storage (barra/estado "Subiendo…"); al terminar, la miniatura queda "lista".
  - **Sin conexión:** la foto queda **"pendiente"** (badge) y se guarda con la respuesta; se subirá al sincronizar (reusa la cola y el `PwaShell` de v1.2-4a).
- **Validación:** si el campo es requerido y no hay fotos, error inline. No se puede **enviar** con fotos aún "subiendo"; si hay "pendientes" (offline), el envío **encola** toda la respuesta (incluidas las fotos) como hoy.
- **Peso/limite:** se avisa si una imagen supera el límite tras comprimir (raro); formatos jpg/png/webp.

## 4. (C) Ver la respuesta
- En la ficha de la respuesta, el campo imagen muestra una **grilla de miniaturas**; al tocar una, se **amplía** (diálogo con la imagen a tamaño grande y descargar). Las URLs son **firmadas** y se piden al servidor al abrir la respuesta.
- Si no hay fotos: "Sin fotos".

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de miniaturas. |
| Subiendo | Miniatura con overlay "Subiendo…"; "Enviar" deshabilitado hasta terminar (en línea). |
| Pendiente (offline) | Miniatura con badge "Pendiente"; se enviará al reconectar. |
| Error de subida | Miniatura con ⚠ + "Reintentar"; no bloquea quitar la foto. |
| Vacío (requerido) | Error inline "Agrega al menos una foto". |
| Ver sin fotos | "Sin fotos". |

## 6. Accesibilidad
- El botón de captura es un `<label>`/control con texto ("Tomar o subir foto"); cada miniatura tiene `alt` ("Foto 1 de EPP") y el ✕ un `aria-label`. El diálogo de ampliar atrapa el foco y cierra con Esc. Estados (subiendo/pendiente/error) con texto, no solo color.

## 7. Móvil (≤640px)
- Miniaturas en grilla de 3 columnas; botón de captura a ancho completo; `capture="environment"` abre la cámara; el diálogo de ampliar a pantalla completa.

## 8. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Sheet, Dialog, Button, Badge, Label, Input | Reutilizados | |
| **PhotoField** | Nuevo | miniaturas + captura + compresión + estado subiendo/pendiente |
| **PhotoThumb** / **PhotoViewerDialog** | Nuevo | miniatura con ✕ / ampliar con URL firmada |
| Paleta e `IMAGE` en el diseñador y el `field-renderer` | Extensión | integrar el nuevo tipo |

## 9. Decisiones
- **Reusar Formularios y su offline** (ADR-071/072): "inspección" sin módulo nuevo; la cámara entra por `capture`.
- **Comprimir antes de subir/encolar** (ADR-072): miniaturas rápidas, menos costo, blobs offline livianos.
- **URLs firmadas al ver** (ADR-070): las fotos nunca son públicas; se autorizan sobre la respuesta visible.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
