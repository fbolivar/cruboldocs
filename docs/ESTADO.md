# ESTADO — cruboldocs

> Memoria del proyecto. Toda sesión empieza leyendo este archivo y termina actualizándolo.

## Fase actual
backend — código completo (2026-09-24); falta la prueba de punta a punta con usuarios reales (requiere la clave secreta, ver Pendientes). Siguiente: seguridad.

## Fases completadas
- arquitectura (2026-09-23): alcance del MVP aprobado por Fernando
- diseno (2026-09-23): tokens, specs y mockup aprobados por Fernando
- frontend (2026-09-23): 5 pantallas + acceso + política de datos sobre datos mock; `lint` y `build` en verde
- backend (2026-09-24, en cierre): esquema en Supabase, capa de datos real, Storage, correo y cron; `tsc`, `lint`, `build` y 49 pruebas RLS en verde

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
  4. ✅ Organización CRUBOL TECHNOLOGY S.A.S creada; invitación a operaciones@crubol.com (enlace entregado a mano). Pendiente: prueba de punta a punta (invitar elaborador/revisor/aprobador → registrar → revisar → aprobar → confirmar lectura; riesgo → evidencia).
- **Correo (SMTP) — pospuesto por decisión de Fernando (2026-09-24):** Titan (`smtp.titan.email`, contacto@crubol.com) rechaza la autenticación (535) en 465 y 587; la contraseña del buzón está mal o requiere clave de aplicación. `SMTP_PASSWORD` quedó comentada en `.env.local` para que los correos esperen en la cola sin agotar intentos. Mientras no haya SMTP, al invitar, reenviar o crear una organización la UI muestra el enlace para copiarlo y compartirlo a mano (`InvitationLinkDialog`). Recuperar contraseña tampoco envía correo hasta configurar el SMTP propio en Supabase Auth.
- Fase seguridad: `/fase seguridad` (auditoría obligatoria antes del deploy). Revisar además: enlace de invitación visible al administrador cuando no hay SMTP; bucket `evidencias` acepta cualquier tipo de archivo; FKs sin índice (linter, informativo); la página /recuperar no muestra aviso cuando el enlace venció (`?enlace=vencido`).
- Antes del deploy: completar datos de Crubol en `/tratamiento-de-datos` y revisión legal.
- Deploy: cargar en Vercel las variables de `.env.example` (con `NEXT_PUBLIC_APP_URL` del dominio) y `CRON_SECRET`.

## Notas para la próxima sesión
- El modo demo y el mock se eliminaron: para ver la app hay que ingresar con un usuario real.
- Pruebas RLS: `npm run test:rls` (PGlite, sin Docker). Toda migración nueva: agregarla a `supabase/migrations/`, correr las pruebas, aplicarla con el MCP de Supabase y regenerar tipos.
- El servidor de desarrollo corre en el puerto 3001 (el 3000 está ocupado por otro proceso).
- Next.js 16.3.6: leer `node_modules/next/dist/docs/` antes de escribir código (ver AGENTS.md).
