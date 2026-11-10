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

## 7. Rediseño del login (2026-11-09 — **APROBADO por Fernando el 2026-11-09**)

Inspiración: login split-screen con panel de bienvenida ilustrado + tarjeta de formulario limpia.
**Adaptado a la realidad de CrubolDocs:** sin registro/"sign in", sin login social, sin "keep connected"
(acceso solo por invitación, ADR-005). Solo cambia `/login`; `/recuperar` e `/invitacion` conservan su spec.

### Wireframe (escritorio)
```
┌────────────────────────────────────┬─────────────────────────────────────┐
│  PANEL DE MARCA (gradiente + hex)   │                                     │
│  ⬡ CrubolDocs                       │     Ingresa a CrubolDocs      (h1)   │
│                                     │                                     │
│  "Tu sistema de gestión,            │     ✉  Correo                        │
│   bajo control."            (h1)    │     ────────────────────────         │
│                                     │     🔒 Contraseña            👁       │
│  Párrafo de valor (body-lg):        │     ────────────────────────         │
│  control documental, trazabilidad   │     ¿Olvidaste tu contraseña?        │
│  de firmas/lecturas y riesgos        │     [ widget Turnstile ]            │
│  medidos. Preciso y confiable.      │     (  Ingresar  )  ← pill           │
│                                     │                                     │
│  ◇ Ilustración geométrica (hex/     │     Crubol Technology S.A.S ·        │
│    cubos isométricos + anillos,     │     Tratamiento de datos (Ley 1581) │
│    colores de marca)                │                                     │
│  patrón hexagonal de fondo ≤6%      │                                     │
└────────────────────────────────────┴─────────────────────────────────────┘
```

### Cambios respecto a la versión actual
- **Panel de marca enriquecido:** además del logo y la promesa (h1), un **párrafo de valor** (body-lg,
  texto blanco/mentolado) y una **ilustración geométrica** (cubos/hexágonos isométricos con anillos
  orbitales, construida con los colores de marca sobre el gradiente; sin imágenes externas, SVG inline).
  Mantiene el patrón hexagonal ≤6%. Sigue siendo el único lugar con gradiente.
- **Tarjeta de formulario más limpia:** campos con **ícono guía** (correo, candado) y **línea inferior**
  (en reposo `borde-fuerte`; en foco `acento` 2px). Label flotante o superior `label`. Contraste AA y
  foco visible intactos. Mostrar/ocultar contraseña con `aria-label`.
- **Botón primario tipo pill** (`rounded-full`) `acento` → `acento-hover`, full-width, alto 44 (táctil).
- **Sin** pestañas de registro, **sin** botones sociales, **sin** "recordarme". El widget **Turnstile**
  va sobre el botón (como hoy). Pie con enlace a tratamiento de datos.

### Móvil (≤640px)
- El panel de marca se reduce a una franja superior (~140px): logo + promesa en una línea; la ilustración
  se oculta o se reduce a un hexágono. La tarjeta ocupa el ancho (gutter 16), inputs de 44px.

### Estados
Iguales a §4 (carga: "Ingresando…" con spinner; error: alerta `error-suave` "Correo o contraseña
incorrectos."). La línea inferior del campo con error pasa a `error`.

### Accesibilidad
- Los íconos guía son decorativos (`aria-hidden`); cada campo conserva su `<label>`.
- Contraste del texto sobre el gradiente ≥ 4.5:1 (texto blanco; el párrafo usa blanco o `acento-suave`,
  nunca `acento-claro`/`acento-medio` como texto).

### Componentes
- `BrandPanel` (actualizar: + párrafo + ilustración SVG). `LoginForm` (actualizar estilo de inputs y botón).
  Tokens sin cambios; no se inventan colores nuevos.

Mockup de aprobación: `design/mockup/login-rediseno.html` (y versión publicada para revisar en pantalla).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
