# DEPLOY — cruboldocs

Procedimiento de despliegue y operación en Vercel + GitHub. Léelo completo antes del primer deploy.
Estado del proyecto y pendientes: ver `docs/ESTADO.md`.

## 0. Antes de empezar (prerrequisitos)
- [ ] `npm run check` en verde (lint + tsc + unitarias + RLS + build). **No** con el dev de 3001 activo.
- [ ] Auditoría de seguridad **APTO** (ya aprobada por Fernando; ver `docs/seguridad/`).
- [ ] Bloqueantes de lanzamiento cerrados (ver `docs/ESTADO.md` → "Fase actual"): términos de servicio aprobados por legal, ajustes de Supabase Auth, y **purga de los datos de prueba** (paso 8).

## 1. Modelo de entornos
- **GitHub**: rama de producción = **`master`** (hoy no existe `main`). Cada rama/PR genera un **Preview** automático en Vercel.
  - Decisión abierta: si se prefiere `main` como rama por defecto, renombrar antes de crear el repo (`git branch -m master main`) y usar `main` en todos los pasos.
- **Supabase**: se usa **un solo proyecto** para producción (`cruboldocs`, ref `dcteuwybqtktwvpfweyr`, org `bc-fabric-sas`, región us-east-2). Decisión de Fernando: sin branch/base de pruebas aparte (sin costo extra).
  - ⚠️ Por eso los **datos de prueba están en la base real** y deben purgarse antes de publicar (paso 8).
- **v1 sin pagos**: no hay Stripe ni webhooks de pago en esta versión (omitir ese paso del método genérico).

## 2. Repositorio en GitHub
1. Crear un repositorio **privado** en GitHub (sin README para no generar conflictos).
2. Enlazar y subir:
   ```bash
   git remote add origin git@github.com:<org-o-usuario>/cruboldocs.git
   git push -u origin master   # o main si se renombró
   ```
3. Confirmar que **no** se sube ningún secreto: `.env.local` está en `.gitignore`; `.env.example` no lleva valores reales.

## 3. Importar en Vercel
1. Vercel → **Add New → Project** → importar el repo. Framework **Next.js** (auto-detectado). Root = raíz del repo.
2. Rama de producción = `master` (o `main`). No desplegar aún: primero cargar las variables (paso 4).
3. El cron ya está declarado en `vercel.json` (`/api/cron/diario`, `0 11 * * *` = **06:00 America/Bogotá**).

## 4. Variables de entorno (14)
Cargar en Vercel → Project → Settings → Environment Variables. Valores de producción **solo** en *Production*;
para *Preview* usar valores de prueba (o los mismos de dev). Los valores reales viven en `.env.local`.

| Variable | Ámbito | Origen / valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | Supabase → API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | **servidor** | Supabase → API Keys (`sb_secret_…`). Nunca exponer |
| `SMTP_HOST` | servidor | `smtp.titan.email` (SMTP propio de crubol.com; ver ESTADO) |
| `SMTP_PORT` | servidor | `465` |
| `SMTP_USER` | servidor | `info@crubol.com` |
| `SMTP_PASSWORD` | servidor | contraseña del buzón (de `.env.local`) |
| `SMTP_FROM` | servidor | `CrubolDocs <info@crubol.com>` (mismo buzón del usuario) |
| `CRON_SECRET` | servidor | token aleatorio; Vercel Cron lo manda como `Authorization: Bearer` |
| `NEXT_PUBLIC_APP_URL` | público | **dominio de producción**: `https://cruboldocs.crubol.com` |
| `UPSTASH_REDIS_REST_URL` | servidor | Upstash Redis (REST). Obligatoria en prod |
| `UPSTASH_REDIS_REST_TOKEN` | servidor | Upstash Redis (REST). Obligatoria en prod |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | público | Cloudflare Turnstile. Obligatoria en prod |
| `TURNSTILE_SECRET_KEY` | servidor | Cloudflare Turnstile (misma secreta va en Supabase Auth) |
| `CF_PROXY_SECRET` | servidor | Solo con proxy de Cloudflare (§7). Mismo valor en la Transform Rule de Cloudflare. Sin proxy: dejar vacío |

> Sin `UPSTASH_*` ni `*TURNSTILE*` el login y recuperar contraseña **fallan a propósito** en producción.

## 5. Supabase Auth (producción)
En Supabase → Authentication:
- **URL Configuration**: *Site URL* = `https://cruboldocs.crubol.com`; *Redirect URLs* incluir `https://cruboldocs.crubol.com/**` (y mantener `http://localhost:3001/**` para desarrollo). El enlace de recuperar vuelve a `/auth/confirmar`.
- **Attack Protection → CAPTCHA**: proveedor **Turnstile** con `TURNSTILE_SECRET_KEY`. Activar solo cuando la UI ya envía el token (ya lo hace). Probar el login tras activarlo; si falla, desactivar y avisar.
- **Rate Limits → IP Address Forwarding**: activado.
- Protección de contraseñas filtradas + política de contraseñas (mín. 10, complejidad, *Secure password change*).
- **Pendientes del bloqueante #3** (ver ESTADO): aviso de contraseña cambiada, **vida del JWT ≤ 1 h**, y límite de verificación MFA.

## 6. Turnstile y Upstash en producción
- **Turnstile**: agregar el hostname `cruboldocs.crubol.com` al widget `CrubolDocs`. La misma secreta va en Vercel y en Supabase Auth.
- **Upstash**: configurar una **alerta de cuota** (plan gratis).

## 7. Dominio y DNS
1. Vercel → Project → Settings → Domains → agregar `cruboldocs.crubol.com`.
2. DNS en Cloudflare: registro `CNAME`/`A` hacia Vercel.
3. Esperar el certificado HTTPS automático de Vercel.

**Decisión de Fernando (2026-11-09): el registro queda CON proxy de Cloudflare (nube naranja)**, como capa extra (WAF/anti-DDoS). Esto cambia la IP que ve la app, así que hay que compensarlo para que el rate limiting y el `Sb-Forwarded-For` sigan usando la IP real del usuario:
- **Cloudflare → Rules → Transform Rules → Modify Request Header**: regla que aplica a todo el tráfico del hostname y **Set static** la cabecera `x-cf-proxy-secret` = valor de `CF_PROXY_SECRET` (el de `.env.local`).
- **Vercel**: cargar `CF_PROXY_SECRET` (Production) con el mismo valor.
- La app (`src/lib/security/client-ip.ts`) solo confía en `cf-connecting-ip` cuando llega ese secreto; si alguien golpea el origen de Vercel directo (sin el secreto), usa la IP de la conexión directa. Así la IP nunca es falsificable.
- Endurecimiento opcional (recomendado): bloquear el acceso directo al origen `*.vercel.app` (Vercel Firewall por rangos de Cloudflare, o Deployment Protection), para que todo entre por Cloudflare.
- Turnstile: el proxy no cambia el hostname, así que la validación de hostname sigue bien.

## 8. Purga de datos de prueba y textos legales (antes de publicar)
- [ ] **Purgar los datos de prueba** cargados el 2026-11-09 (inventario y orden de borrado en `docs/ESTADO.md` → "Notas para la próxima sesión"): borrar por `organization_id` en orden de FKs y eliminar los 2 usuarios de prueba (`revisor.demo@`, `aprobador.demo@`).
- [ ] **Términos de servicio** (`/terminos`): tras la aprobación legal, enlazar en `AuthFooter` (`src/components/auth/auth-card.tsx`), quitar `robots:{index:false}` de la página, agregarlo a `src/app/robots.ts`, y fijar la vigencia.
- [ ] Fijar `EMPRESA.vigenciaDesde` de `/tratamiento-de-datos` con la fecha de publicación.

## 9. Deploy y verificación
1. Lanzar el deploy de producción (push a `master` o *Promote* desde el dashboard).
2. **Probar el camino dorado completo en la URL real** (ya validado en local, repetir en prod): registrar documento con PDF → revisar → aprobar → vigente → confirmar lectura → riesgo con evidencia.
3. Probar **recuperar contraseña** en producción (debe enviar correo por el SMTP propio y volver a `/auth/confirmar`).

## 10. Post-deploy
- Verificar **headers de seguridad** en producción: `curl -I https://cruboldocs.crubol.com` o securityheaders.com. Debe aparecer HSTS (solo en prod), CSP con nonce, y las demás cabeceras de `next.config.ts`.
- Activar **logs/observabilidad** de Vercel para errores 500.
- Confirmar que el **cron** `/api/cron/diario` corre (Vercel → Crons) y responde 200 con `CRON_SECRET`.

## 11. Rollback
- **App**: Vercel → Deployments → elegir el último deployment estable → **Promote to Production** (instantáneo).
- **Datos**: nunca revertir migraciones a ciegas. Escribir una migración correctiva en `supabase/migrations/`, probarla con `npm run test:rls`, aplicarla y regenerar tipos.

## 12. Contactos
- Responsable: Fernando Bolívar (`fbolivarb@gmail.com`).
- Correo del servicio / SMTP: `info@crubol.com`. Datos personales: `datos@crubol.com`.

## Checklist de salida
- [ ] `npm run check` en verde y auditoría APTO
- [ ] Repo en GitHub con remoto; `master` (o `main`) como producción
- [ ] 14 variables cargadas y separadas por entorno (Production con valores reales)
- [ ] Supabase Auth: Site/Redirect URLs, CAPTCHA, rate limits, JWT ≤ 1 h, avisos MFA
- [ ] Turnstile con el hostname de prod; Upstash con alerta de cuota
- [ ] Dominio `cruboldocs.crubol.com` con HTTPS activo y DNS sin proxy
- [ ] Datos de prueba purgados; `/terminos` aprobado y enlazado; vigencias fijadas
- [ ] Camino dorado y recuperar contraseña probados en la URL real
- [ ] Headers de seguridad verificados; logs y cron activos
- [ ] Rollback documentado y entendido
