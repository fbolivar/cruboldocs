# Design Spec — Notificaciones Slack/Teams

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/notificaciones/ARQUITECTURA.md (v1.4-7) + ADR-100/101/102.

## 1. Propósito y protagonista
- **Qué logra:** que el Admin conecte un canal de Slack/Teams y elija qué eventos del SGC se avisan ahí.
- **Protagonista:** la **lista de canales** dentro de la pestaña Notificaciones de Administración.
- **Marco:** reusa el patrón de la pestaña Webhooks/API (lista + Sheet para agregar + acciones por fila).

## 2. `/app/admin` → pestaña "Notificaciones"
- Texto guía: "Publica avisos del SGC en Slack o Teams. Pega la URL de *incoming webhook* de tu canal."
- **Lista de canales:** nombre, proveedor (chip Slack/Teams), eventos suscritos (chips), estado (badge Activo/Inactivo), URL **enmascarada** (`…/TMX…abc`). Acciones por fila: **Probar**, **Activar/Desactivar**, **Editar**, **Eliminar**.
- **"Agregar canal"** (Sheet):
  - Proveedor (Select: Slack / Teams).
  - Nombre (p. ej. "Canal Calidad").
  - URL del incoming webhook (input; se valida host Slack/Teams + https al guardar; error claro si no coincide).
  - Eventos (casillas): Nueva no conformidad · Nueva PQRS · Nueva salida no conforme · Nueva solicitud.
  - Guardar.
- **Probar:** envía un mensaje de prueba al canal; toast "Mensaje enviado" o error ("No pudimos publicar: revisa la URL").
- Vacío: "Aún no hay canales. Agrega el primero para recibir avisos en Slack o Teams."
- Solo **Admin de organización / Líder SIG** ve la pestaña.

## 3. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de lista. |
| Vacío | EmptyState con "Agregar canal". |
| Guardando / Probando | Botón en loading. |
| Éxito | Toast; el canal aparece/actualiza en la lista. |
| Error de URL | Mensaje claro bajo el campo: "La URL debe ser de Slack (hooks.slack.com) o Teams (…webhook.office.com)." |
| Error de envío | Toast humano; el canal queda pero marca el último error. |

## 4. Accesibilidad / Móvil
- Casillas de eventos con `label`; URL con `aria-describedby` para el error. En móvil: lista en tarjetas, Sheet a ancho completo, botones a ancho completo. La URL se muestra enmascarada (no se filtra el secreto en pantalla).

## 5. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Sheet, Select, Input, Checkbox, EmptyState | Reutilizados | |
| **NotifiersTab** (en Admin) | Nuevo | lista + acciones |
| **AddNotifierSheet** | Nuevo | proveedor + URL + eventos |
| **NotifierRow** | Nuevo | fila con Probar/Activar/Editar/Eliminar |

## 6. Decisiones
- **URL enmascarada** en la UI (ADR-102): el secreto no se muestra completo.
- **Validación de host** visible al usuario (ADR-101): se explica por qué una URL es inválida.
- **Mensaje sin PII**: la nota del Sheet aclara que el aviso lleva solo el código y el título.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
