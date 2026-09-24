# ESTADO — cruboldocs

> Memoria del proyecto. Toda sesión empieza leyendo este archivo y termina actualizándolo.

## Fase actual
seguridad — auditoría hecha (2026-09-24): **NO APTO para deploy**. Informe: `docs/seguridad/AUD-20260924.md` (0 críticos, 5 altos, 8 medios, 9 bajos). El deploy queda bloqueado hasta remediar los altos y re-auditar. Remediación: **bloque 1 (integridad) hecho** (2026-09-24, migración 010; ALTA-01, MED-02, MED-05 corregidos); quedan ALTA-02 a ALTA-05.

## Fases completadas
- arquitectura (2026-09-23): alcance del MVP aprobado por Fernando
- diseno (2026-09-23): tokens, specs y mockup aprobados por Fernando
- frontend (2026-09-23): 5 pantallas + acceso + política de datos sobre datos mock; `lint` y `build` en verde
- backend (2026-09-24): esquema en Supabase, capa de datos real, Storage, correo y cron; `tsc`, `lint`, `build` y 49 pruebas RLS en verde
- seguridad (2026-09-24): auditoría con veredicto NO APTO (ver `docs/seguridad/AUD-20260924.md`); remediación pendiente

## Decisiones tomadas
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
  - ALTA-02 invitaciones insertables por REST con token elegido + cuenta confirmada sin probar el correo → pre-secuestro de cuentas entre organizaciones.
  - ALTA-03 sin rate limiting (oráculo de contraseña en aceptar invitación; límite por IP de Supabase compartido por Vercel → DoS de login).
  - ALTA-04 Superadmin lee riesgos y documentos de todos los clientes, puede darse acceso total y no tiene MFA.
  - ALTA-05 Admin se asigna rol funcional por REST (evade "solo metadatos") y las escrituras de administración no se auditan en BD.
  - **Decisiones de Fernando (2026-09-24):** rate limiting con **Upstash Redis** (`@upstash/ratelimit`, plan gratis; por IP real y por correo/token); CAPTCHA **Cloudflare Turnstile** en login, recuperar contraseña y aceptar invitación (nativo en Supabase Auth); **MFA TOTP obligatoria solo para el Superadmin** (exigir `aal2` en sus acciones); el Superadmin ve **solo metadatos** (organizaciones, usuarios, cargos), nunca documentos ni riesgos.
  - **Orden de trabajo (una sesión por bloque, con `/fase seguridad`):** ~~1) integridad (ALTA-01, MED-02, MED-05)~~ ✅ → 2) identidad (ALTA-02, ALTA-03, MED-04, MED-06, BAJ-02) → 3) privilegios (ALTA-04, ALTA-05, MED-01, MED-08) → 4) plataforma (MED-03, MED-07, BAJ-09) → 5) re-auditoría. Próximo: **bloque 2 (identidad)**.
  - Bloque 2, prerrequisitos listos (2026-09-24): Upstash Redis `beloved-finch-295937` (us-east-2, plan gratis; ping y escritura verificados) y widget Turnstile `CrubolDocs` (hostname `localhost`; secret verificada con siteverify). Claves en `.env.local`: `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. **Activar el CAPTCHA en Supabase Auth (Attack Protection) solo cuando la UI ya envíe el token**, o el login deja de funcionar. Al publicar: agregar el dominio de producción al widget.
  - Después: re-auditoría de los altos y pruebas RLS nuevas por cada corrección.
- Bloque 1 (2026-09-24): subida a `<base>/subida/<archivo>` con `upsert: false`; el servidor valida (tamaño, firma binaria) y escribe los mismos bytes en `<base>/<archivo>` (sin token). `set_version_files(p_actor, …)` y `register_evidence(p_actor, …)` solo `service_role`. `signVersion` compara el SHA-256 del PDF guardado antes de firmar. Tipos de archivo en `src/lib/domain/files.ts`. Residual bajo: limpiar temporales `*/subida/*` viejos (job diario).
- Otros pendientes no de seguridad: FKs sin índice (linter, informativo); la página /recuperar no muestra aviso cuando el enlace venció (`?enlace=vencido`).
- Antes del deploy: completar datos de Crubol en `/tratamiento-de-datos` y revisión legal.
- Deploy: cargar en Vercel las variables de `.env.example` (con `NEXT_PUBLIC_APP_URL` del dominio) y `CRON_SECRET`.

## Notas para la próxima sesión
- El modo demo y el mock se eliminaron: para ver la app hay que ingresar con un usuario real.
- Pruebas RLS: `npm run test:rls` (PGlite, sin Docker). Toda migración nueva: agregarla a `supabase/migrations/`, correr las pruebas, aplicarla con el MCP de Supabase y regenerar tipos.
- El servidor de desarrollo corre en el puerto 3001 (el 3000 está ocupado por otro proceso).
- No correr `next build` con el dev server de 3001 activo (rompe `.next`); verificar con `npx tsc --noEmit` y `npm run lint`. Lanzar el dev desde PowerShell (`npm run dev -- -p 3001`), no desde Git Bash (falla `next/font`).
- Next.js 16.3.6: leer `node_modules/next/dist/docs/` antes de escribir código (ver AGENTS.md).
