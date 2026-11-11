# Design Spec — Portal externo (PQRS pública + autoevaluación de proveedor)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/portal/ARQUITECTURA.md (v1.4-3) + ADR-088/089/090.

## 1. Propósito y protagonista
- **Qué logra:** que un **externo** (cliente o proveedor) complete un formulario público sin cuenta.
- **Protagonista:** el **formulario** (lo único que ve el externo).
- **Marco:** reusa el layout público de la encuesta (`/encuesta/[token]`): tarjeta centrada, logo, sin navegación de la app.

## 2. `/pqrs/[token]` — radicar PQRS
```
◇ CrubolDocs — <Organización>
Radica tu petición, queja o reclamo
┌───────────────────────────────┐
│ Tipo *   ( Petición ▾ )        │
│ Tu nombre (opcional)           │
│ Correo o teléfono (opcional)   │
│ Cuéntanos * (textarea)         │
│ [ Turnstile ]                  │
│ [ Enviar ]                     │
└───────────────────────────────┘
```
- **Campos:** Tipo (petición/queja/reclamo/sugerencia/felicitación), Nombre (opc.), Contacto (opc.), Descripción (req), Turnstile.
- **Éxito:** pantalla de agradecimiento ("Recibimos tu caso. Gracias."). **Buzón desactivado / token inválido:** mensaje neutro ("Este formulario no está disponible.").
- Aviso breve de tratamiento de datos con enlace.

## 3. `/proveedor/[token]` — autoevaluación
```
◇ CrubolDocs — <Organización>
Autoevaluación de proveedor: <Nombre del proveedor>
┌───────────────────────────────┐
│ Tu puntaje (0–100) *           │
│ Comentarios (opcional)         │
│ [ Turnstile ]                  │
│ [ Enviar ]                     │
└───────────────────────────────┘
```
- **Campos:** Puntaje 0–100 (req), Comentarios (opc.), Turnstile.
- **Éxito:** "Gracias, recibimos tu autoevaluación." **Token inválido:** mensaje neutro.

## 4. Controles internos
- **`/app/pqrs` → "Buzón público"** (si `can_manage_pqrs`): Sheet/diálogo con un **toggle Activado/Desactivado** y, si está activo, el **enlace** (`/pqrs/<token>`) con **Copiar** y **"Regenerar enlace"** (invalida el anterior). Texto: "Comparte este enlace para que tus clientes radiquen PQRS sin cuenta."
- **`/app/proveedores/[codigo]`:**
  - Botón **"Enviar autoevaluación"** → genera/rota el token y muestra el **enlace** (`/proveedor/<token>`) con Copiar.
  - Sección **"Autoevaluaciones recibidas"**: lista (puntaje, fecha, comentario, estado); botón **"Marcar revisada"**. Vacío: "Sin autoevaluaciones aún".

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga (público) | Skeleton del formulario. |
| Inválido/desactivado | Mensaje neutro, sin pistas. |
| Enviando | Botón cargando; Turnstile requerido. |
| Éxito | Pantalla de agradecimiento. |
| Error | Mensaje humano + reintentar; conserva lo escrito. |

## 6. Accesibilidad / Móvil
- Campos con `label`; errores con `aria-describedby`; Turnstile accesible. Tarjeta a ancho completo en móvil; botón de envío a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| AuthCard/PublicCard, Turnstile, Button, Input, Select, Textarea, FormAlert | Reutilizados (de encuesta/login) | |
| **PublicPqrsForm** / **SupplierSelfAssessmentForm** | Nuevo | formularios públicos |
| **PublicPqrsSheet** (en PQRS) | Nuevo | activar/desactivar + enlace |
| **SupplierSelfAssessmentPanel** (en ficha proveedor) | Nuevo | enviar enlace + respuestas |

## 8. Decisiones
- **Reusar el marco público de la encuesta** (ADR-088): consistencia y menos trabajo.
- **Mensajes neutros** ante token inválido/desactivado: no se filtra si existe o no.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
