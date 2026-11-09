# ESTADO — cruboldocs

> Memoria del proyecto. Toda sesión empieza leyendo este archivo y termina actualizándolo.

## Fase actual
pre-lanzamiento — **revisado (2026-09-25): código listo, aún NO lanzar.** `check` en verde (lint, tsc, 157 unitarias, 167 RLS, build) y 48 E2E contra el build. Seguridad APTO (§9 del informe: migración 015, el anónimo sin privilegios de tabla). **Bloquean el lanzamiento:**
1. Camino dorado con sesión probado a mano (`docs/QA-CHECKLIST.md` §2): nunca se ha recorrido de punta a punta.
2. Términos de servicio: **borrador listo en `/terminos`** (`src/app/terminos/page.tsx`, 2026-11-09) con jurisdicción Colombia/Bogotá D.C., servicio "tal cual" sin SLA, gratis en v1 (B2B), responsabilidad del cliente sobre el contenido (7.6-1), sin antivirus en v1 (7.6-1) y supresión por anonimización (7.6-2). **Falta:** revisión legal; confirmar el buzón de notificaciones (hoy `info@crubol.com`, marcado TODO); y al aprobar: enlazarlo en `AuthFooter` (`src/components/auth/auth-card.tsx`), agregarlo a `src/app/robots.ts` (quitar `robots:{index:false}` de la página), y fijar la vigencia el día del deploy. Hoy NO está enlazado ni indexado (solo accesible por URL directa).
3. Supabase Auth: aviso de contraseña cambiada, vida del JWT ≤ 1 h y límite de verificación MFA (condición 7.5.4, en el panel).
4. Fase deploy: **`docs/DEPLOY.md` redactado (2026-11-09)** con el procedimiento completo, las 14 variables y el rollback. Falta **ejecutarlo**: crear repo en GitHub y agregar remoto (hoy **sin remoto**; rama de producción `master`, no existe `main`), proyecto de Vercel con las 14 variables de `.env.local`, dominio `cruboldocs.crubol.com` con DNS sin proxy de Cloudflare, y probar recuperar contraseña en producción.

Advertencias: alerta de cuota en Upstash; fijar `EMPRESA.vigenciaDesde` de `/tratamiento-de-datos` el día de publicación; sin sitemap, OG ni JSON-LD porque v1 no tiene landing. Siguiente: Fernando cierra 1–3 → fase **deploy**.

## Fases completadas
- arquitectura (2026-09-23): alcance del MVP aprobado por Fernando
- diseno (2026-09-23): tokens, specs y mockup aprobados por Fernando
- frontend (2026-09-23): 5 pantallas + acceso + política de datos sobre datos mock; `lint` y `build` en verde
- backend (2026-09-24): esquema en Supabase, capa de datos real, Storage, correo y cron; `tsc`, `lint`, `build` y 49 pruebas RLS en verde
- seguridad (2026-09-24): auditoría, remediación (bloques 1–4, 6) y re-auditoría; veredicto **APTO, aprobado por Fernando el 2026-09-24** (§8). Ver `docs/seguridad/AUD-20260924.md` secciones 6 y 7.
- testing (2026-09-24): Vitest + Playwright + RLS en verde; `docs/QA-CHECKLIST.md`.
- pre-lanzamiento (2026-09-25): verificación de testing, seguridad (migración 015), SEO (robots.txt, metadataBase) y deploy; pendientes bloqueantes en "Fase actual".

## Decisiones tomadas
- Testing (2026-09-24): **sin rama de Supabase ni base de pruebas** (decisión de Fernando: sin costo adicional). Los E2E solo cubren flujos sin sesión y no escriben en la base real; el flujo con sesión se prueba a mano (QA-CHECKLIST §2). Dependencias de desarrollo: `vitest@4` (unitarias; la v5 exige `@types/node` ≥ 22) y `@playwright/test` (E2E).
- Dependencias de seguridad (2026-09-24): `@upstash/ratelimit` + `@upstash/redis` para límites de intentos (decisión de Fernando: Upstash plan gratis).
- Producto: CrubolDocs, SaaS de gestión de calidad (control documental + riesgos). Detalle en `docs/ARQUITECTURA.md`.
- Sin cobro en v1; alta de organizaciones por Superadmin + invitación (ADR-005).
- Roles asignados a cargos; vigencia, externos y recertificación en `memberships` (ADR-001).
- Visor: PDF obligatorio + fuente descargable; sin comparación de versiones (ADR-002).
- Correo por SMTP propio de Hostinger (`nodemailer`) con outbox + cron diario (ADR-003).
- Firma electrónica simple: reautenticación + registro + hash (ADR-004).
- Exportaciones en CSV UTF-8 con BOM (sin dependencia).
- 5 pantallas: `/app`, `/app/documentos`, `/app/documentos/[id]`, `/app/riesgos`, `/app/admin`.
- Diseño (2026-09-23): preset Hex Core; personalidad confiable, precisa, clara; **solo modo claro en v1**. Tokens en `design/tokens.md` (Tailwind v4 con `@theme`, fuentes con `next/font`). Extensiones al preset por contraste AA: `acento-hover`, variantes `-texto`/`-suave` de semánticos y 4 colores de nivel de riesgo.
- Specs: `design/spec-shell.md`, `spec-acceso.md`, `spec-inicio.md`, `spec-documentos.md`, `spec-ficha-documento.md`, `spec-riesgos.md`, `spec-admin.md`. Mockup: `design/mockup/index.html` (abrir en el navegador; `?movil` para vista de 390px).

- Frontend (2026-09-23):
  - shadcn/ui (Radix, preset nova) tematizado con los tokens; dependencias justificadas en el commit 969e60f. `cn` de shadcn en vez de clsx + tailwind-merge; `next-themes` desinstalado (solo modo claro).
  - Visor PDF **nativo del navegador** (iframe + "Abrir en pantalla completa"); sin pdf.js.
  - Corte móvil/escritorio **768px** (`md`), no 640 (decisión de Fernando; documentado en `design/spec-shell.md`).
  - Admin sin rol funcional **no ve comentarios de revisión** (decisión de Fernando; en `docs/ARQUITECTURA.md` y en la spec de la ficha). El backend debe aplicarlo en RLS de `review_comments`.
  - Página pública `/tratamiento-de-datos` (Ley 1581) en **borrador**: faltan NIT, domicilio, correo y fecha de vigencia de Crubol y revisión legal antes del deploy.
  - CSV con separador `;` (Excel es-CO) + BOM y protección contra inyección de fórmulas.
  - Fechas: "hoy" y vencimientos se calculan en zona America/Bogota (`src/lib/format.ts`).

- Backend (2026-09-24):
  - Proyecto Supabase **cruboldocs** (`dcteuwybqtktwvpfweyr`), org `bc-fabric-sas` (Pro, ~USD 10/mes), región **us-east-2** (se pidió sa-east-1; quedó así al crearlo desde el panel). Migraciones 001–009 aplicadas; tipos en `src/lib/supabase/database.types.ts` (regenerar tras cada migración).
  - Lecturas: todas con la sesión del usuario (RLS). La clave secreta solo en: firma tras reautenticación, invitaciones, Storage (URLs de subida y verificación), auditoría de acciones de administración, outbox y cron.
  - Archivos: el navegador sube directo a Storage con URL firmada (Vercel limita el cuerpo a 4,5 MB); el servidor descarga, valida tamaño y `%PDF-`, calcula SHA-256 y registra. Rutas `documentos/<org>/<doc>/<versión>/<archivo>` y `evidencias/<org>/<control>/<uuid>/<archivo>`.
  - Migración 009: quien registra el borrador (Líder SIG/de proceso) adjunta y envía aunque el elaborador sea otro cargo; bucket acepta PowerPoint; `org_directory(org)` da nombre y cargo de colegas (sin correo).
  - Frecuencia de controles pasó de texto libre a lista fija (diaria…anual, por evento), igual que el esquema.
  - Firma: reautenticación con cliente efímero (no toca la sesión) → `sign_version` con IP y user-agent.
  - Invitaciones: token de 256 bits, en la base solo su SHA-256, vence en 7 días. Si el correo ya tiene cuenta, se pide su contraseña actual para vincularlo. La aceptación de la política de datos queda en `audit_log`.
  - Superadmin sin organizaciones ve "Crubol" y solo la pestaña Organizaciones. Selector de organización activa en el menú de cuenta.
  - Correo: `after()` vacía el outbox tras cada mutación; cron diario 06:00 Bogotá (`vercel.json`) como respaldo.
  - Sin sesión → /login; con sesión sin membresía vigente → /sin-acceso.

## Pendientes / próxima acción
- **Fernando, para cerrar backend:**
  1. ✅ Clave secreta en `.env.local` (verificada 2026-09-24).
  2. ✅ Superadmin creado: fbolivarb@gmail.com (Fernando Bolivar Buitrago). Cambiar la contraseña temporal al ingresar.
  3. ✅ Registro público desactivado en Supabase Auth. Pendiente: Site URL y Redirect URLs (`http://localhost:3001/**` y el dominio de producción).
  4. ✅ Organización CRUBOL TECHNOLOGY S.A.S creada; invitación a operaciones@crubol.com (enlace entregado a mano).
  5. Pendiente: prueba de punta a punta. Sin correo se puede con alias de Gmail (`fbolivarb+elaborador@gmail.com`, `+revisor`, `+aprobador`): invitar → copiar enlace → abrir en incógnito. Flujo: registrar → revisar → aprobar → confirmar lectura; riesgo → evidencia. La fase testing la automatiza con Playwright.
- **Correo (SMTP) — autenticación verificada (2026-09-24, segunda prueba):** `smtp.titan.email` 465 y 587 aceptan info@crubol.com (`nodemailer.verify()`, sin envío). `SMTP_PASSWORD` activada en `.env.local` y `SMTP_FROM` = info@crubol.com (mismo buzón). Envío real de prueba recibido por Fernando (2026-09-24). SMTP propio configurado por Fernando en Supabase Auth (recuperar contraseña). Variables `SMTP_*` en Vercel: se cargan en la fase deploy (aún no existe el proyecto en Vercel, por decisión de Fernando). Historial del primer intento: Titan (`smtp.titan.email`; MX y SPF de crubol.com confirmados en Titan) rechaza la autenticación de info@crubol.com por SMTP (465/587) e IMAP aunque el webmail abre: contraseña distinta (webmail abierto por SSO de Hostinger), plan sin acceso para apps externas o clave de aplicación. Al activarlo, `SMTP_FROM` debe usar el mismo buzón del usuario. `SMTP_PASSWORD` quedó comentada en `.env.local` para que los correos esperen en la cola sin agotar intentos. Mientras no haya SMTP, al invitar, reenviar o crear una organización la UI muestra el enlace para copiarlo y compartirlo a mano (`InvitationLinkDialog`). Recuperar contraseña tampoco envía correo hasta configurar el SMTP propio en Supabase Auth.
- **Remediación de seguridad (bloquea el deploy)** — detalle y plan en `docs/seguridad/AUD-20260924.md`:
  - ~~ALTA-01~~ ✅ corregido en el bloque 1 (ver sección 5 del informe).
  - ~~ALTA-02~~ ✅ corregido en el bloque 2.
  - ~~ALTA-03~~ ✅ corregido (Upstash + Turnstile + `Sb-Forwarded-For`; CAPTCHA de Supabase Auth verificado en vivo el 2026-09-24).
  - ~~MED-04~~ ✅ política de contraseñas y protección de filtradas activas en Supabase Auth (2026-09-24).
  - ~~ALTA-04~~ ✅ corregido en el bloque 3 (Superadmin con MFA `aal2` y solo metadatos).
  - ~~ALTA-05~~ ✅ corregido en el bloque 3 (traza por triggers; nadie cambia los roles de su cargo).
  - ✅ MFA del Superadmin registrado (TOTP verificado, 2026-09-24).
  - **Decisiones de Fernando (2026-09-24):** rate limiting con **Upstash Redis** (`@upstash/ratelimit`, plan gratis; por IP real y por correo/token); CAPTCHA **Cloudflare Turnstile** en login, recuperar contraseña y aceptar invitación (nativo en Supabase Auth); **MFA TOTP obligatoria solo para el Superadmin** (exigir `aal2` en sus acciones); el Superadmin ve **solo metadatos** (organizaciones, usuarios, cargos), nunca documentos ni riesgos.
  - **Orden de trabajo (hecho):** bloques 1–4 → re-auditoría (5) → bloque 6 (RA-01 a RA-04 + Bajos; migraciones 013 y 014; 160 pruebas RLS). Veredicto APTO.
  - **Decisiones 7.6 confirmadas por Fernando (2026-09-24):** (1) sin antivirus en v1, riesgo declarado en los términos de servicio; (2) supresión de datos por anonimización (script de soporte antes de la primera solicitud; confirmar con la revisión legal).
  - **Condiciones del deploy (sección 7.5):** DNS sin proxy de Cloudflare; `NEXT_PUBLIC_APP_URL` en Vercel (Turnstile valida el hostname); en Supabase Auth: aviso de contraseña cambiada, vida del JWT y límite de verificación MFA; alerta de cuota en Upstash; probar recuperar contraseña en producción (el enlace vuelve a `/auth/confirmar`, que ya solo acepta recuperación).
  - Bloque 2, prerrequisitos listos (2026-09-24): Upstash Redis `beloved-finch-295937` (us-east-2, plan gratis; ping y escritura verificados) y widget Turnstile `CrubolDocs` (hostname `localhost`; secret verificada con siteverify). Claves en `.env.local`: `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. **Activar el CAPTCHA en Supabase Auth (Attack Protection) solo cuando la UI ya envíe el token**, o el login deja de funcionar. Al publicar: agregar el dominio de producción al widget.
  - Después: re-auditoría de los altos y pruebas RLS nuevas por cada corrección.
  - **Fernando, para cerrar el bloque 2 (Supabase > Authentication):** (1) *Rate Limits > IP Address Forwarding*: activar. (2) *Attack Protection*: CAPTCHA Turnstile con `TURNSTILE_SECRET_KEY`; probar luego el login de la app (si falla, desactivar y avisar). (3) *Attack Protection*: protección de contraseñas filtradas. (4) *Providers > Email*: mínimo 10, requisitos de complejidad y *Secure password change* (MED-04). Probar de punta a punta: invitar a un alias nuevo (crea cuenta) y a un correo que ya tiene cuenta (pide ingresar y unirse).
- Bloque 4 (2026-09-24): dominio de producción **cruboldocs.crubol.com** (decisión de Fernando). CSP con nonce en `src/proxy.ts` (política en `src/lib/security/csp.ts`); el proxy cubre toda página y el refresco de sesión sigue solo en `/`, `/login`, `/mfa`, `/app/**`. `await connection()` en el layout raíz: **todas las páginas se renderizan por petición** (no quitarlo: sin nonce la CSP bloquea los scripts). Resto de cabeceras en `next.config.ts` (HSTS solo en producción). Todo origen externo nuevo (scripts, iframes, fetch del navegador) debe agregarse a `csp.ts`. Cambiar la contraseña revoca las otras sesiones (verificado); el JWT ya emitido vale hasta expirar.
  - BAJ-09 y MED-07 cerrados por Fernando (2026-09-24): URLs de Supabase Auth y hostname de Turnstile con el dominio; domicilio en Bogotá D.C.; revisión legal y DPA aprobados.
- Bloque 3 (2026-09-24): `is_platform_admin()` exige `aal2`; la cuenta Superadmin sin `aal2` va a `/mfa` (`is_platform_admin_account()` la detecta). El Superadmin solo ve `organizations` y `platform_organizations()` (conteo de usuarios y la invitación pendiente del admin inicial, que puede reenviar); crea organizaciones con `create_organization` (servidor, tras verificar `aal2` con la base). La traza de administración la escriben triggers `t_audit` (actor = sesión o `app.actor` en RPC de servidor); la app ya no llama a `log_event` para eso. Membresías sin INSERT por REST y UPDATE solo en `position_id`, `valid_until`, `status`, `last_recertified_at`; nadie edita su membresía ni los roles de su cargo; solo un Admin toca a otro Admin. El `email` de `profiles` no se lee por REST: `member_contacts(org)` para Admin/Líder SIG y el propio desde el JWT. CSP del bloque 4: el QR del MFA es `data:image/svg+xml` (`img-src data:`). Residuales en el informe.
- Bloque 2 (2026-09-24): invitaciones solo por RPC de servidor (`create_invitation`, `reissue_invitation`, `accept_invitation`, con `p_actor`, traza en BD y aceptación atómica). **Si el correo ya tiene cuenta, se une con la sesión iniciada** (`/login?siguiente=/invitacion/<token>`), nunca escribiendo la contraseña en la invitación. El enlace manual de invitación solo en desarrollo sin SMTP. Solo un Admin invita administradores. Límites en `src/lib/security/rate-limit.ts`; Turnstile en `src/components/auth/turnstile.tsx` (sin dependencia) y verificación en `src/lib/security/turnstile.ts`; login y recuperar van por `createAuthClient(ip)` (clave secreta + `Sb-Forwarded-For`). Si Upstash cae, se permite el intento (residual bajo). CSP del bloque 4: permitir `challenges.cloudflare.com`.
- Bloque 1 (2026-09-24): subida a `<base>/subida/<archivo>` con `upsert: false`; el servidor valida (tamaño, firma binaria) y escribe los mismos bytes en `<base>/<archivo>` (sin token). `set_version_files(p_actor, …)` y `register_evidence(p_actor, …)` solo `service_role`. `signVersion` compara el SHA-256 del PDF guardado antes de firmar. Tipos de archivo en `src/lib/domain/files.ts`. Residual bajo: limpiar temporales `*/subida/*` viejos (job diario).
- Otros pendientes no de seguridad: FKs sin índice (linter, informativo); la página /recuperar no muestra aviso cuando el enlace venció (`?enlace=vencido`).
- En el deploy: fijar la fecha de vigencia de `/tratamiento-de-datos` (`EMPRESA.vigenciaDesde`) con la fecha de publicación.
- Deploy: cargar en Vercel las variables de `.env.example` (con `NEXT_PUBLIC_APP_URL` del dominio), `CRON_SECRET`, `UPSTASH_*` y `*TURNSTILE*` (obligatorias en producción: sin ellas login y recuperar fallan a propósito).

## Notas para la próxima sesión
- **Datos de demostración + camino dorado probado (2026-11-09):** se cargaron datos de prueba en la base real de la org CRUBOL TECHNOLOGY S.A.S (5 procesos, 6 cargos con roles, 5 tipos documentales, 6 documentos sin PDF, 3 riesgos con valoración/controles/evidencia, 5 tareas) y, recorriendo el flujo real en el navegador, se registró el documento **PR-GC-001** (con PDF + fuente reales en Storage, SHA-256) y se llevó **registrar→revisar→aprobar→vigente** con 3 usuarios distintos (separación de funciones verificada: el elaborador no puede firmar su revisión). Bloqueante #1 (camino dorado) **validado completo en local** por la UI: flujo documental (registrar→revisar→aprobar→vigente), **confirmación de lectura** (se agregó distribución al cargo Administrador en PR-GC-001; Fernando/operaciones confirmó, queda en read_acknowledgements) y **riesgos** (riesgo R-04 identificado con valoración inherente Alto 16, control preventivo semanal y **evidencia con archivo de soporte** en Storage). Falta repetirlo en producción tras el deploy. Nota: la evidencia solo la registra quien ocupa el **cargo responsable** del control (`responsiblePositionId === viewer.positionId`); para la demo se cambió el responsable del control de R-04 a Administrador.
  - **Artefactos de prueba: PURGADOS el 2026-11-09** vía SQL Editor de Supabase (la base volvió al estado pre-sesión: 0 procesos/documentos/riesgos/tareas, 1 cargo Administrador, 1 membresía; usuarios de prueba eliminados). El conector MCP rechaza `DELETE`, por eso se corrió a mano. **Pendiente menor:** borrar 3 archivos huérfanos en Storage desde el panel — bucket `documentos`: `ec197086-…/ef086dd7-…/` (PDF + .docx); bucket `evidencias`: `ec197086-…/11dca571-…/` (PDF de evidencia). Nota: `audit_log` se conserva (inmutable por diseño); su FK `actor_id` *ON DELETE SET NULL* choca con la inmutabilidad, así que para borrar usuarios hubo que desactivar temporalmente el trigger — relevante para el script de anonimización (7.6-2).
  - **Credenciales temporales de prueba (local):** `fbolivarb@gmail.com` (Superadmin, con MFA); `operaciones@crubol.com` = `Crubol2026.ops` (Admin org); `revisor.demo@crubol.com` = `Crubol2026.rev`; `aprobador.demo@crubol.com` = `Crubol2026.apr`.
- Pruebas: `npm test` (Vitest, `tests/unit/`), `npm run test:rls`, `npm run test:e2e` (usa el dev de 3001 si está activo), `npm run test:e2e:prod` (tras `npm run build`, levanta `next start` en 3002 y agrega HSTS/CSP estricta), `npm run check` (lint + tsc + unitarias + RLS + build; **no con el dev activo**). Antes de cada release: `docs/QA-CHECKLIST.md`.
- Turnstile dibuja su iframe en un shadow DOM cerrado: en Playwright se verifica con `page.frames()`, no con un locator.
- Seguridad (bloque 6): `/auth/confirmar` solo acepta recuperación y `updatePassword` exige la sesión de recuperación (< 15 min): no sirve para cambiar la contraseña desde la app con sesión normal. Aceptar una invitación no reescribe un acceso activo; un acceso revocado vuelve solo con invitación nueva. La recertificación (mantener o revocar) la aplica la base al insertar en `access_recertifications`.
- El modo demo y el mock se eliminaron: para ver la app hay que ingresar con un usuario real.
- Pruebas RLS: `npm run test:rls` (PGlite, sin Docker). Toda migración nueva: agregarla a `supabase/migrations/`, correr las pruebas, aplicarla con el MCP de Supabase y regenerar tipos.
- El servidor de desarrollo corre en el puerto 3001 (el 3000 está ocupado por otro proceso).
- No correr `next build` con el dev server de 3001 activo (rompe `.next`); verificar con `npx tsc --noEmit` y `npm run lint`. Lanzar el dev desde PowerShell (`npm run dev -- -p 3001`), no desde Git Bash (falla `next/font`).
- Next.js 16.3.6: leer `node_modules/next/dist/docs/` antes de escribir código (ver AGENTS.md).
