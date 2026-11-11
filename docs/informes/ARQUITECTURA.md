# Arquitectura — Informes imprimibles (PDF por el navegador)

**Producto:** CrubolDocs · **Feature:** v1.3-3a · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** varios módulos (Revisión por la dirección, SG-SST, Indicadores) necesitan un **informe imprimible/PDF** como evidencia de auditoría; hoy solo hay CSV y el PDF estaba diferido. Las suites lo venden; es la "deuda de PDF".
- **Acción de valor:** desde cada informe, un botón **"Imprimir / PDF"** abre una **vista de impresión** limpia (sin el marco de la app) que el usuario guarda como PDF con el navegador.
- **Decisión de método (Fernando, 2026-11-11):** **impresión por el navegador** (CSS de impresión + `window.print()`), **sin dependencia nueva** ni costo de servidor (ADR-066). Si más adelante se requiere un PDF con marca estricta, se migra a `@react-pdf/renderer` (anotado, no en v1).
- **Cobro:** incluido. Sin dato personal nuevo (los informes muestran lo que el usuario ya puede ver por RLS).

## 2. Modelo de dominio
**Sin cambios de esquema.** No hay tablas ni migraciones. Los informes **reutilizan los queries existentes**:
- Revisión por la dirección → `getReview(code)`
- SG-SST → `getSstEvaluation(code)`
- Indicadores → `listIndicators()` + `getIndicatorSummary()`
- Caracterización de proceso → `getProcessDetail(code)`

Cada vista de impresión corre **con el cliente del usuario** (RLS aplica); si no puede ver el registro, `notFound()`.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Vista de impresión de **Revisión por la dirección** (acta 9.3) | **Sí** | Informe más auditado |
| Vista de impresión de **SG-SST** (autoevaluación 0312: puntaje, ítems, plan) | **Sí** | Evidencia 0312 |
| Vista de impresión de **Indicadores** (tablero del periodo) | **Sí** | KPIs para la dirección |
| Vista de impresión de **Caracterización de proceso** (4.4) | **Sí** | Ficha de proceso imprimible |
| Encabezado común con **organización, título, código, fecha de emisión y "emitido por"** | **Sí** | Identidad del informe |
| Botón "Imprimir / PDF" en cada ficha + barra de impresión (oculta al imprimir) | **Sí** | Acceso directo |
| PDF con marca estricta en el servidor (`@react-pdf`) | No | Diferido (ADR-066); el navegador basta para el MVP |
| Programar/enviar informes por correo | No | Diferido |
| Tablero **configurable** | No | Es la sub-feature **3b**, aparte |

**Camino dorado:** abrir una Revisión por la dirección → "Imprimir / PDF" → se abre la vista limpia → `Ctrl/Cmd+P` → **Guardar como PDF**.

## 4. Mapa de rutas
Rutas de impresión **bajo `/app`** (para que la autenticación y la RLS apliquen igual), una por informe:
- `/app/revisiones/[codigo]/imprimir`
- `/app/sg-sst/[codigo]/imprimir`
- `/app/indicadores/imprimir`
- `/app/procesos/[codigo]/imprimir`

Cada una: **ve** quien ya puede ver el módulo (misma gate del módulo: `canSeeReviews` / `canSeeSst` / `canSeeIndicators` / `canSeeProcessMap`); si no, `notFound()`. El **marco de la app** (sidebar, topbar, tab bar, PWA) se oculta en impresión con la variante `print:hidden` de Tailwind; la vista de impresión ocupa el ancho completo.

## 5. Integraciones y riesgos
**Servicios externos / dependencias:** **ninguno nuevo.**

**Top 3 riesgos y mitigación:**
1. **El marco de la app aparece en el PDF** → se marca el chrome (sidebar/topbar/tab bar/PWA) con `print:hidden`; la barra de impresión también; se prueba el `@media print` en cada vista.
2. **Fidelidad variable entre navegadores** → layout simple (una columna, tipografía del sistema de diseño, sin elementos interactivos); márgenes y saltos controlados con utilidades `print:`; se difiere el PDF con marca estricta si hiciera falta.
3. **Fuga de datos en el informe** → la vista corre con el cliente del usuario (RLS), misma gate del módulo; no se usa `service_role`; `notFound()` si no hay acceso.

## ADRs

### ADR-066 — PDF por el navegador (sin dependencia)
**Contexto:** generar PDF con librería (`@react-pdf`) o headless (puppeteer) agrega dependencia/costo; la regla del proyecto evita dependencias sin justificación fuerte.
**Decisión:** informes como **vistas de impresión** con CSS (`@media print` / variantes `print:`) y `window.print()`; el usuario guarda como PDF. Sin dependencia nueva.
**Consecuencias:** cero costo y entrega rápida; la fidelidad depende del navegador y el usuario da un paso (Guardar como PDF). Migración futura a `@react-pdf` documentada si se exige marca estricta.

### ADR-067 — Rutas de impresión bajo `/app` reusando los queries
**Contexto:** las vistas necesitan auth + RLS y los datos ya existen en la capa de queries.
**Decisión:** rutas `/app/<módulo>/[codigo]/imprimir` que reutilizan `getReview`/`getSstEvaluation`/`listIndicators`/`getProcessDetail`, con la misma gate de rol del módulo; el shell se oculta con `print:hidden`. Sin backend nuevo.
**Consecuencias:** sin migración ni RPC; la seguridad es la del módulo origen (no se amplía superficie); un encabezado común se comparte entre las 4 vistas.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (layout de impresión + encabezado común). Luego frontend, verificación de seguridad (sin nueva superficie) y deploy. Después, **3b Tablero configurable**.
