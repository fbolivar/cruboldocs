# Design Spec — SCAR: Solicitud de acción correctiva a proveedor

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/scar/ARQUITECTURA.md (v1.5-3) + ADR-109/110/111.

## 1. Propósito y protagonista
- **Qué logra:** pedir acción correctiva a un proveedor y seguir su respuesta hasta el cierre.
- **Protagonistas:** público → el **formulario de respuesta**; interno → la **sección SCAR** en la ficha de proveedor.
- **Marco:** reusa el layout público del portal (autoevaluación de proveedor) y el patrón de ficha con secciones.

## 2. `/scar/[token]` — respuesta del proveedor (pública)
```
◇ CrubolDocs — <Organización>
Solicitud de acción correctiva — <Proveedor>
Problema: «<título>»  ·  <descripción>  ·  Plazo: <fecha>
┌───────────────────────────────┐
│ Causa raíz *   (textarea)      │
│ Acciones correctivas * (textarea)│
│ Fecha compromiso (opcional)    │
│ [ Turnstile ]                  │
│ [ Enviar ]                     │
└───────────────────────────────┘
```
- **Campos:** Causa raíz (req), Acciones correctivas (req), Fecha compromiso (opc.), Turnstile.
- **Éxito:** "Gracias, recibimos tu respuesta." **Token inválido / ya respondida / cerrada:** mensaje neutro ("Este formulario no está disponible.").

## 3. `/app/proveedores/[codigo]` — sección "SCAR"
- Botón **"Emitir SCAR"** (Sheet): título, descripción del problema (sin datos del cliente), plazo (días → fecha). Al crear → muestra el **enlace** (`/scar/<token>`) con **Copiar**.
- **Lista de SCARs** del proveedor: código, estado (badge), plazo, NC ligada (si hay). Fila → detalle.
- **Detalle de un SCAR** (expandible o panel): el problema; si **respondida**, la respuesta del proveedor (causa raíz, acciones, fecha compromiso); acciones del SIG: **Aceptar** (cierra), **Rechazar** (Sheet con notas → reabre), **Anular**. Enlace con Copiar mientras esté abierto.

## 4. `/app/no-conformidades/[codigo]` — emitir desde la NC
- Botón **"Emitir SCAR"** (si la NC la gestiona): Sheet que **elige el proveedor** y precarga título/descripción desde la NC; al crear, el SCAR queda **ligado a la NC** y muestra el enlace.

## 5. Badges / estados
- **ScarStatusBadge:** enviada→info, respondida→advertencia, aceptada→exito, rechazada→error-suave, anulada→neutro.
| Estado | Comportamiento |
|---|---|
| Carga (público) | Skeleton del formulario. |
| Inválido/cerrada (público) | Mensaje neutro, sin pistas. |
| Enviando | Botón cargando; Turnstile requerido. |
| Éxito (público) | Pantalla de agradecimiento. |
| Interno vacío | "Sin SCAR para este proveedor" + Emitir. |
| Revisión | Aceptar/Rechazar visibles solo en estado 'respondida'. |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 6. Accesibilidad / Móvil
- Campos con `label`; Turnstile accesible; mensajes neutros ante token inválido. En móvil: tarjeta pública a ancho completo; en la ficha, lista en tarjetas y Sheets a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| PublicCard, Turnstile, Button, Input, Textarea, Sheet, Badge, EmptyState, CopyLinkField | Reutilizados | |
| **ScarPublicForm** | Nuevo | formulario público |
| **ScarPanel** (en ficha proveedor) | Nuevo | emitir + lista + revisión |
| **IssueScarButton** (en NC) | Nuevo | emitir desde la NC |
| **ScarStatusBadge** | Nuevo | estado |

## 8. Decisiones
- **Reusar el marco público del portal** (ADR-109): consistencia.
- **Rechazo reabre** (ADR-110): mismo enlace, el proveedor corrige.
- **Mensajes neutros** ante token inválido: no se filtra si existe o no.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
