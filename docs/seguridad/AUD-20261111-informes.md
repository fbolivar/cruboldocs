# Auditoría de seguridad — Informes imprimibles (v1.3-3a)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** vistas de impresión (PDF por el navegador) de Revisión por la dirección, SG-SST, Indicadores y Caracterización de proceso.
**Archivos:** `src/components/informes/*`, `src/app/app/revisiones/[codigo]/imprimir`, `.../sg-sst/[codigo]/imprimir`, `.../indicadores/imprimir`, `.../procesos/[codigo]/imprimir`, `src/app/app/layout.tsx` (print:hidden del chrome).

## Resumen ejecutivo
Feature **solo de presentación**: no agrega tablas, RPCs, dependencias ni endpoints. Cada vista de impresión corre bajo `/app` (misma autenticación por middleware) con el **cliente del usuario** (RLS aplica) y la **misma gate de rol** del módulo origen; `notFound()` si no hay acceso. No se amplía la superficie de seguridad. Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Autenticación y RLS sin cambios | Las rutas están bajo `/app/**` (middleware protege); usan `getReview`/`getSstEvaluation`/`listIndicators`/`getProcessDetail` con el cliente del usuario (RLS). E2E de acceso sin sesión ampliada con las 4 rutas (redirigen a login). | OK |
| 2 | Verificado | Autorización por rol del módulo | Cada página valida `canSeeReviews`/`canSeeSst`/`canSeeIndicators`/`canSeeProcessMap` y `notFound()` si falla. No hay gate nueva ni más laxa. | OK |
| 3 | Verificado | Sin exposición de datos sensibles | El informe de Revisión no incluye IP de firmantes (solo nombre/fecha); no hay dato personal nuevo; nada de `service_role`. | OK |
| 4 | Info | Sin dependencias ni backend | PDF por `window.print()` + CSS `print:`; sin librerías nuevas, sin migración, sin RPC. Advisors de BD sin cambios (no se tocó el esquema). | Aceptado |
| 5 | Verificado | `robots: noindex` en las vistas | Cada página de impresión declara `robots: { index: false }` (igual que el resto de `/app`). | OK |

## Checklist
- [x] Sin nueva superficie (tablas/RPC/endpoints/dependencias)
- [x] Auth + RLS heredadas; misma gate de rol que el módulo origen
- [x] Sin dato personal nuevo; sin IP en el acta
- [x] tsc + lint + 527 RLS (sin cambios) + 237 unitarias + build en verde
- [x] E2E de acceso sin sesión ampliada con las rutas de impresión
