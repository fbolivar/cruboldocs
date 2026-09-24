# ESTADO — cruboldocs

> Memoria del proyecto. Toda sesión empieza leyendo este archivo y termina actualizándolo.

## Fase actual
frontend — completada (2026-09-23). Siguiente: backend.

## Fases completadas
- arquitectura (2026-09-23): alcance del MVP aprobado por Fernando
- diseno (2026-09-23): tokens, specs y mockup aprobados por Fernando
- frontend (2026-09-23): 5 pantallas + acceso + política de datos sobre datos mock; `lint` y `build` en verde

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

## Pendientes / próxima acción
- Ejecutar `/fase backend`. Contrato para reemplazar el mock sin tocar componentes:
  - Lecturas: `src/lib/data/queries.ts` (conservar firmas y tipos de `src/lib/types.ts`).
  - Mutaciones: `src/lib/data/actions.ts` (Server Actions que devuelven `Result`). Faltan acciones reales para reemplazar archivos de una versión y crear la versión N+1 (hoy la ficha lo simula en pantalla).
  - Eliminar al terminar: `src/lib/data/mock-data.ts`, `src/lib/data/demo.ts`, `setDemoUser`/`setDemoScenario`, el bloque "Solo desarrollo" del menú de usuario y `src/proxy.ts` (pasa a refrescar la sesión de Supabase). `/` debe redirigir a `/app` si hay sesión.
  - Subida de archivos: hoy simulada (tope 25 MB, PDF + fuente obligatorios); pasar a Storage privado con URL firmada.
- Antes del deploy: completar datos de Crubol en `/tratamiento-de-datos` y revisión legal.
- Fase backend: crear un proyecto NUEVO en Supabase (confirmar organización y costo con Fernando antes de crearlo). SMTP: cuenta propia de Hostinger (smtp.hostinger.com, 465 SSL). Credenciales solo en `.env.local` y en Vercel.

## Notas para la próxima sesión
- Demo local (solo desarrollo): `?demo_usuario=<id>&demo_estado=normal|vacio|error|carga` en cualquier URL de `/app`. Usuarios: u-laura (admin, por defecto), u-juan (revisor), u-carlos (aprobador), u-diana (responsable de control), u-andres (auditor externo), u-sofia (consulta), u-oscar (admin solo metadatos), u-crubol (superadmin). También en el menú del avatar: "Ver como…" y "Simular estado…".
- El servidor de desarrollo corre en el puerto 3001 (el 3000 está ocupado por otro proceso).
- Next.js 16.3.6: leer `node_modules/next/dist/docs/` antes de escribir código (ver AGENTS.md).
