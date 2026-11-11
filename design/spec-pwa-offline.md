# Design Spec — PWA offline de formularios (UX de instalación y sin conexión)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pwa-lms/ARQUITECTURA.md (4a) + ADR-058.

## 1. Propósito y protagonista
- **Qué logra:** instalar la app y **diligenciar formularios sin conexión**, con las respuestas en cola que se **envían al reconectar**.
- **Protagonista:** el **estado de la respuesta** (enviada / guardada para enviar / error de sincronización).
- **Roles:** cualquier miembro activo que diligencia formularios (igual que `/app/formularios/.../responder`).

## 2. Piezas de UX (no son pantallas nuevas; se integran en lo existente)

### 2.1 Instalación (A2HS)
- Un botón discreto **"Instalar app"** en el menú/encabezado cuando el navegador ofrece `beforeinstallprompt` (se oculta si ya está instalada o no es instalable). Al pulsarlo, se dispara el prompt nativo.

### 2.2 Indicador de conexión
- **Banner sutil** (no modal) cuando se pierde la conexión, fijado al pie o bajo el encabezado:
  **"Sin conexión — puedes seguir diligenciando; tus respuestas se enviarán al reconectar."** Tono
  `advertencia-suave`, con ícono de nube tachada. Desaparece al volver online.

### 2.3 Diligenciar offline (en `responder`)
- El formulario abierto **queda disponible offline** (cacheado al abrirlo con conexión).
- Al pulsar **"Enviar"** sin conexión: en vez de enviar, **se guarda en la cola** y se muestra la pantalla
  de éxito adaptada: **"Guardado — se enviará cuando vuelva la conexión"** (ícono de reloj/nube), con
  "Responder otra" / volver.
- Si el formulario **no está cacheado** y no hay red: mensaje neutro "No pudimos cargar este formulario
  sin conexión; ábrelo una vez con señal para usarlo offline."

### 2.4 Pendientes de envío
- Un **indicador "Pendientes (N)"** visible (en el encabezado de Formularios y/o como badge) cuando hay
  respuestas en cola. Al abrirlo: lista de respuestas en cola (formulario, fecha de captura, estado:
  **en cola / enviando / error**). 
- **Al reconectar**, se sincroniza automáticamente; toast **"N respuesta(s) enviada(s)"**. Si una falla
  la validación del servidor, queda con **estado error** y un mensaje; botón **"Reintentar"** y la
  posibilidad de abrirla para corregir.

### 2.5 Actualización del SW
- Cuando hay una versión nueva de la app en caché: aviso sutil **"Hay una actualización — recargar"** con
  un botón; nunca recarga sola en medio de una captura.

## 3. Estados
| Estado | Comportamiento |
|---|---|
| Online | Comportamiento normal; "Enviar" envía de inmediato. |
| Offline, formulario cacheado | Se diligencia; "Enviar" encola y muestra "Guardado para enviar". |
| Offline, formulario NO cacheado | Mensaje neutro para abrirlo una vez con señal. |
| Sincronizando | Los ítems en cola muestran "Enviando…"; al terminar, toast de resumen. |
| Error de sincronización | El ítem queda en "Error" con el mensaje del servidor + "Reintentar"/corregir. |
| Instalable / instalada | Botón "Instalar app" visible solo cuando aplica. |

## 4. Accesibilidad
- El indicador de conexión no depende solo del color (texto + ícono). Los estados de la cola se anuncian
  (`aria-live="polite"`) al cambiar. El prompt de instalación y el de actualización son operables por
  teclado. Nada bloquea la captura.

## 5. Móvil (≤640px)
- Es el caso principal. Banner de conexión a ancho completo; pantalla de "Guardado para enviar" a ancho
  completo; "Pendientes (N)" accesible desde el encabezado; botones táctiles grandes.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Button, Badge, Card, toast, EmptyState | Reutilizados | |
| **InstallAppButton** | Nuevo | aparece con `beforeinstallprompt` |
| **OfflineBanner** | Nuevo | indicador de conexión (escucha `online`/`offline`) |
| **PendingSubmissions** | Nuevo | lista de la cola + estado + reintentar |
| **SwUpdatePrompt** | Nuevo | aviso de actualización de la app |
| SubmissionForm (de #5) | Extendido | "Enviar" offline → encola; éxito adaptado |

## 7. Decisiones y porqués
- **Sin modales que interrumpan:** la captura en campo no debe bloquearse; los avisos son sutiles y no
  intrusivos.
- **"Guardado para enviar" explícito:** el usuario de campo necesita saber que su trabajo no se perdió,
  aunque no haya señal.
- **Validación al sincronizar, no al encolar:** la integridad la decide el servidor; offline se guarda y
  luego se valida (ADR-058).
- **Limpieza al cerrar sesión:** coherente con la privacidad en dispositivos compartidos.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
