---
name: seguridad-saas
description: Metodología de auditoría y hardening de seguridad para SaaS en Next.js + Supabase + Vercel — RLS, secretos, OWASP, headers, dependencias. Usar antes de cada release, en /auditoria-seguridad o cuando un feature toque datos, auth o pagos.
---

# Seguridad SaaS

## Cuándo usar
Antes de cada deploy a producción, al cerrar features que tocan datos/auth/pagos, o a demanda con /auditoria-seguridad.

## Checklist de auditoría

### 1. Datos y RLS (crítico)
- [ ] TODAS las tablas con RLS habilitado (`select relname from pg_class` vs políticas; ninguna tabla pública sin política).
- [ ] Políticas filtran por `organization_id` vía membership del usuario autenticado, no por parámetros del cliente.
- [ ] Sin uso de `service_role` key en código que corre en el navegador. La `anon` key es la única del cliente.
- [ ] Prueba práctica: con dos organizaciones de prueba, verificar que el usuario A no lee ni escribe datos de la org B.

### 2. Secretos
- [ ] `.env*` en `.gitignore`; `git log -p | grep -iE "key|secret|password"` sin resultados reales.
- [ ] `.env.example` documenta variables sin valores.
- [ ] Claves solo en variables de entorno de Vercel; `NEXT_PUBLIC_` únicamente para valores que pueden ser públicos.

### 3. Entrada y APIs (OWASP)
- [ ] Toda server action / route handler valida entrada con Zod antes de tocar la BD.
- [ ] Autorización verificada en el servidor en cada endpoint (no confiar en que la UI oculta el botón).
- [ ] Sin construcción de SQL por concatenación; solo cliente de Supabase o consultas parametrizadas.
- [ ] Rate limiting en endpoints sensibles (login, registro, webhooks) — Vercel/Upstash o equivalente.

### 4. Auth y sesiones
- [ ] Flujo de Supabase Auth con verificación de email; contraseñas con política mínima.
- [ ] Middleware protege todas las rutas `/app/**`; redirección correcta si no hay sesión.
- [ ] Webhooks (Stripe u otros) verifican firma antes de procesar.

### 5. Headers y plataforma
- [ ] `next.config` con headers: CSP (al menos base), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS en producción.
- [ ] `npm audit` sin vulnerabilidades High/Critical sin justificar.
- [ ] Sourcemaps no expuestos en producción si no se necesitan.

## Entregable
`docs/seguridad/AUD-YYYYMMDD.md`:
1. Resumen ejecutivo (3 líneas) y veredicto: APTO / APTO CON CONDICIONES / NO APTO para deploy.
2. Tabla de hallazgos: ID | Severidad | Descripción | Evidencia | Remediación.
3. Severidad: Crítica (explotable ya, expone datos), Alta, Media, Baja.

Regla dura: hallazgos Críticos o Altos abiertos = NO se despliega.
