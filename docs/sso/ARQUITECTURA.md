# Arquitectura — SSO (Entrar con Google / Microsoft)

**Producto:** CrubolDocs · **Feature:** v1.3-5b · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase Auth · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** los clientes empresariales esperan **inicio de sesión único** con su cuenta corporativa (Google Workspace / Microsoft 365); hoy solo hay correo + contraseña. El SSO reduce fricción y es un requisito de compra frecuente.
- **Acción de valor:** botones **"Entrar con Google"** y **"Entrar con Microsoft"** en el login; el usuario autentica con su proveedor y entra sin contraseña propia.
- **Decisiones (Fernando, 2026-11-11):** **solo SSO** en este ciclo (la **API pública se difiere**, feature mayor aparte); proveedores **Google + Microsoft**; el SSO es **login alterno** y **el acceso sigue por membresía** (no cambia el modelo de alta por invitación).
- **Cobro:** incluido.

## 2. Modelo / técnica
**Sin cambios de esquema ni RLS** (no hay migración). Se usa **Supabase Auth OAuth (PKCE)**, que ya es parte del stack.

- **Proveedores:** `google` y `azure` (Microsoft) configurados en el panel de Supabase (ver §5, dependencia de Fernando).
- **Flujo:**
  1. El usuario pulsa "Entrar con Google/Microsoft" → el **cliente del navegador** llama `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: <origin>/auth/callback } })` (fija el verificador PKCE en cookie) y redirige al proveedor.
  2. El proveedor regresa a **`/auth/callback`** (ruta nueva, server) que hace `exchangeCodeForSession(code)` y redirige a `/app` (o a `/login` con aviso si hay error). Espejo del `/auth/confirmar` existente.
  3. En `/app`, `getCurrentUser` resuelve la organización por **membresía**; si el correo del SSO **no** tiene membresía vigente, redirige a **`/sin-acceso`** (comportamiento actual, sin cambios).
- **Acceso por membresía (ADR-076):** el SSO **autentica**, no **autoriza**. Un usuario invitado entra a su organización solo si el correo del proveedor **coincide** con el de su invitación/membresía. Uno sin membresía queda en `/sin-acceso`.
- **Botones detrás de flags (ADR-077):** se muestran solo si el proveedor está habilitado (`NEXT_PUBLIC_SSO_GOOGLE` / `NEXT_PUBLIC_SSO_MICROSOFT`), para no exponer un botón roto antes de configurar las credenciales.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Botones "Entrar con Google" y "Entrar con Microsoft" (tras flags) | **Sí** | Núcleo |
| Ruta `/auth/callback` (code exchange) con manejo de error | **Sí** | Cierre del flujo OAuth |
| Acceso por membresía sin cambios (SSO sin membresía → /sin-acceso) | **Sí** | Decisión de Fernando |
| Documentar la configuración del proveedor en `DEPLOY.md` | **Sí** | Habilitación por Fernando |
| **API pública** (tokens por organización, scopes, rate-limit) | No | Diferida — feature mayor propio |
| SSO obligatorio / deshabilitar contraseña por organización | No | Diferido |
| Aprovisionamiento automático (SCIM) / restricción por dominio | No | Diferido |

**Camino dorado:** en `/login`, pulsar **"Entrar con Microsoft"** → autenticar en Microsoft 365 → volver a la app ya con sesión → si el correo está invitado, entra a su organización; si no, ve "sin acceso".

## 4. Mapa de rutas
- **`/login`** (sin cambio de ruta): se agregan los botones SSO bajo el formulario de correo/contraseña.
- **`/auth/callback`** (nueva, server): intercambia el código por sesión y redirige a `/app` o a `/login?sso=error`.
- Middleware/`getCurrentUser`: **sin cambios**.

## 5. Integraciones y riesgos
**Dependencia de configuración (Fernando, fuera del código):**
- En **Supabase → Authentication → Providers**: habilitar **Google** y **Azure (Microsoft)** con su *Client ID/Secret*.
- En **Google Cloud Console** y **Entra ID (Azure AD)**: registrar la app y agregar como *redirect URI* la **URL de callback de Supabase** (`https://<proj>.supabase.co/auth/v1/callback`) y permitir el dominio `cruboldocs.crubol.com`.
- Cargar `NEXT_PUBLIC_SSO_GOOGLE=1` / `NEXT_PUBLIC_SSO_MICROSOFT=1` en Vercel (tipo *Config*, no *Secret*) cuando cada proveedor quede configurado. Sin esas variables, los botones no aparecen.

**Servicios externos / dependencias de código:** **ninguno nuevo** (OAuth es parte de Supabase Auth; sin librerías nuevas).

**Top 3 riesgos y mitigación:**
1. **Botón roto antes de configurar** → los botones viven detrás de flags de entorno; aparecen solo cuando el proveedor está listo.
2. **Open redirect** → `redirectTo` se fija al **propio origen** + `/auth/callback`; el callback solo redirige a rutas internas (`/app`, `/login`); no se acepta un `next` arbitrario.
3. **Cuenta SSO sin acceso** → `getCurrentUser` ya envía a `/sin-acceso`; el SSO no crea membresías (autentica, no autoriza).

## ADRs

### ADR-076 — SSO vía Supabase Auth OAuth; el acceso sigue por membresía
**Contexto:** se requiere SSO corporativo sin romper el modelo de alta por invitación (membership por organización).
**Decisión:** usar Supabase Auth OAuth (PKCE) con Google y Azure; una ruta `/auth/callback` cierra el flujo; el SSO **autentica** y la **autorización** sigue dependiendo de la membresía (sin cambios de esquema/RLS). Sin membresía → `/sin-acceso`.
**Consecuencias:** cero cambios de datos; el SSO es una forma alterna de iniciar sesión; un correo SSO sin invitación no ve datos.

### ADR-077 — Botones SSO tras flags de entorno; API pública diferida
**Contexto:** habilitar un proveedor requiere credenciales que configura Fernando; un botón visible sin config sería un error.
**Decisión:** mostrar cada botón solo si su flag (`NEXT_PUBLIC_SSO_*`) está activo; documentar la configuración en `DEPLOY.md`. La **API pública** se difiere a un feature propio (tokens/scopes/rate-limit/auditoría).
**Consecuencias:** despliegue seguro (sin botones rotos); el SSO se enciende por proveedor cuando esté listo; la API queda en el backlog con alcance claro.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (botones SSO en `/login`). Luego frontend + `/auth/callback`, verificación de seguridad y deploy. **Con esto se cierra el roadmap v1.3** (la API pública queda como próximo feature mayor).
