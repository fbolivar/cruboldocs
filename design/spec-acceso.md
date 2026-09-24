# Design Spec — Acceso: `/login`, `/recuperar`, `/invitacion/[token]`

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** entrar a su organización (o activar su cuenta desde la invitación).
- **Protagonista:** la card del formulario.
- **Acción primaria:** "Ingresar" · "Enviar enlace" · "Activar mi cuenta".

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────┬──────────────────────────────────┐
│  Panel de marca (gradiente)  │                                  │
│  ⬡ CrubolDocs                │   ┌────────────────────────────┐ │
│                              │   │ Ingresa a CrubolDocs  (h1) │ │
│  "Documentos vigentes,       │   │ Correo            [      ] │ │
│   riesgos bajo control."     │   │ Contraseña        [    👁] │ │
│  patrón hexagonal ≤6%        │   │ ¿Olvidaste tu contraseña?  │ │
│                              │   │ [      Ingresar          ] │ │
│                              │   └────────────────────────────┘ │
│                              │   Crubol Technology · Ley 1581   │
└──────────────────────────────┴──────────────────────────────────┘
```

- **Panel de marca** (40 % del ancho, `radio-lg` en el interior, gradiente de marca, texto blanco h2): logo, promesa en una frase, patrón hexagonal tenue. Único lugar de la app con gradiente.
- **Card** (máx. 400px, `superficie`, `sombra-sm`, padding 32): h1, campos una columna con label arriba, link secundario, botón primario full-width. Pie `small` `texto-sec` con enlace a la política de tratamiento de datos.
- **/recuperar:** un campo (correo) + "Enviar enlace". Éxito siempre genérico: "Si el correo está registrado, recibirás un enlace en unos minutos." (no revela si existe).
- **/invitacion/[token]:** encabezado "Te invitaron a **Acme SAS** como **Coordinador de Calidad**" (organización y cargo en `texto`, semibold). Campos: nombre completo, contraseña, confirmar contraseña (requisitos visibles bajo el campo), casilla obligatoria de aceptación del tratamiento de datos (Ley 1581). Botón "Activar mi cuenta". Si el usuario es externo: aviso info "Tu acceso es temporal hasta el 31/12/2026."

## 3. Comportamiento móvil (≤640px)

- Panel de marca se reduce a una franja superior de 120px con el logo; la card ocupa el ancho con gutter 16, sin sombra.
- Inputs de 44px de alto; `type="email"` y `autocomplete` correctos.

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Botón con spinner y deshabilitado ("Ingresando…"). |
| Vacío | No aplica (formulario). |
| Error | Credenciales: alerta `error-suave` arriba del formulario "Correo o contraseña incorrectos." (sin indicar cuál). Invitación vencida o usada: la card cambia a estado de error con ícono hexagonal, "Esta invitación venció o ya fue usada." + "Pide al administrador de tu organización que te envíe una nueva." Validación inline al perder foco ("La contraseña debe tener al menos 10 caracteres"). |
| Éxito | Login → `/app`. Invitación → `/app` con toast "Bienvenido a CrubolDocs". Recuperar → mensaje genérico en la misma card. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| AuthLayout | Nuevo | Panel de marca + slot |
| Input, Label, Button, Checkbox, Alert | shadcn | Tematizados con tokens |
| PasswordInput | Nuevo | Con mostrar/ocultar (aria-label) |

## 6. Decisiones y porqués

- Sin "Crear cuenta": no hay autoregistro (ADR-005).
- Mensajes de error genéricos: no filtrar existencia de usuarios.
- Aceptación de datos en la invitación: es el momento de consentimiento de la Ley 1581.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
