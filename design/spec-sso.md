# Design Spec — SSO en el login (`/login`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/sso/ARQUITECTURA.md (v1.3-5b) + ADR-076/077.

## 1. Propósito y protagonista
- **Qué logra:** permitir iniciar sesión con **Google** o **Microsoft**, además de correo/contraseña.
- **Protagonista:** el formulario de correo/contraseña **sigue siendo** el principal; el SSO es una **alternativa** debajo.
- **Roles:** cualquiera; el acceso real lo da la membresía (sin cambios).

## 2. Wireframe (login)
```
  Iniciar sesión
  ┌───────────────────────────────┐
  │ Correo                        │
  │ Contraseña            (ver)   │
  │ [ Ingresar ]                  │
  │ ¿Olvidaste tu contraseña?     │
  └───────────────────────────────┘

        ──────  o  ──────

  [  G   Entrar con Google     ]
  [  ⊞   Entrar con Microsoft  ]
```
- **Separador** "o" entre el formulario y los botones SSO.
- **Botones SSO** (`variant="outline"`, ancho completo, apilados): ícono del proveedor + texto. Se muestran **solo** si su flag de entorno está activo; si ninguno está activo, no aparece ni el separador.
- Al pulsar: estado **cargando** (spinner, deshabilita ambos) y redirección al proveedor. Si el intercambio falla al volver, el login muestra un **aviso** ("No pudimos completar el inicio con tu proveedor. Intenta de nuevo o usa tu correo.").

## 3. Comportamiento
- **No requiere Turnstile** (el reto humano lo hace el proveedor); el formulario de contraseña mantiene su Turnstile actual.
- La redirección usa `redirectTo = <origin>/auth/callback`; el callback crea la sesión y lleva a `/app` (o `/sin-acceso` por la lógica de membresía existente).
- Error del proveedor → vuelve a `/login?sso=error` y se muestra el `FormAlert`.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Normal | Formulario + (si hay flags) separador y botones SSO. |
| Sin proveedores configurados | Solo el formulario; sin separador ni botones. |
| Cargando SSO | Botón pulsado con spinner; ambos deshabilitados hasta redirigir. |
| Error de SSO | `FormAlert` con mensaje humano; el formulario sigue disponible. |

## 5. Accesibilidad
- Botones con texto (no solo ícono); `aria-busy` al cargar; el separador "o" es decorativo (`aria-hidden`) con el texto accesible. Contraste AA; foco visible.

## 6. Móvil
- Botones a ancho completo, apilados; mismo orden que en escritorio.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Button (outline), FormAlert | Reutilizados | |
| **SsoButtons** | Nuevo | botones Google/Microsoft tras flags; llama `signInWithOAuth` |
| **ProviderIcon** (G / Microsoft) | Nuevo | marcas simples en SVG inline |

## 8. Decisiones
- **SSO como alternativa, no reemplazo** (ADR-076): el correo/contraseña sigue primero; el SSO va debajo.
- **Botones tras flags** (ADR-077): no se muestra un proveedor que aún no está configurado.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
