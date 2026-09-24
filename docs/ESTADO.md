# ESTADO — cruboldocs

> Memoria del proyecto. Toda sesión empieza leyendo este archivo y termina actualizándolo.

## Fase actual
diseno (pendiente de iniciar)

## Fases completadas
- arquitectura (2026-09-23): alcance del MVP aprobado por Fernando

## Decisiones tomadas
- Producto: CrubolDocs, SaaS de gestión de calidad (control documental + riesgos). Detalle en `docs/ARQUITECTURA.md`.
- Sin cobro en v1; alta de organizaciones por Superadmin + invitación (ADR-005).
- Roles asignados a cargos; vigencia, externos y recertificación en `memberships` (ADR-001).
- Visor: PDF obligatorio + fuente descargable; sin comparación de versiones (ADR-002).
- Correo por SMTP propio de Hostinger (`nodemailer`) con outbox + cron diario (ADR-003).
- Firma electrónica simple: reautenticación + registro + hash (ADR-004).
- Exportaciones en CSV UTF-8 con BOM (sin dependencia).
- 5 pantallas: `/app`, `/app/documentos`, `/app/documentos/[id]`, `/app/riesgos`, `/app/admin`.

## Pendientes / próxima acción
- Ejecutar `/fase diseno` (mockup requiere aprobación de Fernando).
- Fase backend: crear un proyecto NUEVO en Supabase (confirmar organización y costo con Fernando antes de crearlo). SMTP: cuenta propia de Hostinger (smtp.hostinger.com, 465 SSL). Credenciales solo en `.env.local` y en Vercel.

## Notas para la próxima sesión
- El servidor de desarrollo corre en el puerto 3001 (el 3000 está ocupado por otro proceso).
- Next.js 16.3.6: leer `node_modules/next/dist/docs/` antes de escribir código (ver AGENTS.md).
