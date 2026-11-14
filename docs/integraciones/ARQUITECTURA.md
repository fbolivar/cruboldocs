# Arquitectura — Integraciones (Zapier/Make + Importación CSV) (v1.6-4)

**Producto:** CrubolDocs · **Feature:** v1.6-4 (último de v1.6) · **Fecha:** 2026-11-13 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router + Route Handlers) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ya hay **API de lectura y escritura** (v1.3/v1.4) y **webhooks firmados** (v1.4-1), pero (a) no están "empaquetados" para no-code (Zapier/Make) y (b) no hay forma de **cargar datos en bloque** (migración/onboarding), que es la fricción #1 para adoptar un eQMS.
- **Acción de valor:** (a) un cliente conecta CrubolDocs en **Zapier/Make** con su API key y arma automatizaciones (trigger = webhook; acción = POST) sin que nosotros programemos nada por cliente; (b) un admin **importa un CSV** (proveedores, procesos, cargos, requisitos legales…) y los registros se crean validados, reusando las mismas reglas que la app.
- **Alcance realista del "app de Zapier/Make":** la *app* se define en las plataformas de Zapier/Make (apuntando a nuestra API); **no es código de este repo**. Lo que sí entra al código: un **endpoint de conexión/prueba** que esas plataformas exigen para validar la key y mostrar la organización, y una **guía de recetas** (triggers/acciones). El resto es configuración externa + envío a sus marketplaces (proceso aparte).
- **Dato personal:** la importación puede traer datos de terceros (p. ej. contacto de proveedor); se valida y queda bajo RLS por `organization_id`. Sin datos sensibles nuevos.

## 2. Modelo / técnica
### (a) Habilitar Zapier/Make sobre lo existente (ADR-124)
- **`GET /api/v1/me`** (Bearer + cualquier scope): devuelve `{ organization: { id, name }, scopes, key_name }`. Es el **test de conexión** estándar de Zapier/Make; no expone datos del negocio.
- **Triggers** = los **webhooks existentes** (los 4 eventos de creación, firmados HMAC) para triggers instantáneos; y los **GET** existentes (orden por `created` desc + `id`) como triggers de *polling*. **Acciones** = los **POST** existentes (NC, medición, PQRS, salida). **Sin endpoints de negocio nuevos.**
- **Guía** `docs/api/INTEGRACIONES.md`: cómo conectar (API key + `/me`), tabla de triggers/acciones, verificación de firma, y 2–3 recetas (p. ej. "fila de Google Sheets → crea PQRS", "NC creada → mensaje de Slack").

### (b) Importación CSV (ADR-125/126) — el trabajo de código del MVP
- **Sin tablas nuevas.** La importación corre como **server action** del usuario autenticado (admin/Líder SIG) y **reutiliza las RPC de creación existentes** por fila → aplica RLS, autorización, contadores, `log_event` igual que la app. (No es la API: aquí sí hay sesión y `auth.uid()`.)
- **Flujo en dos pasos (ADR-126):** (1) **cargar + previsualizar** (dry-run): el servidor parsea el CSV, valida cada fila con zod, resuelve referencias por nombre/código (proceso, cargo) y devuelve un **informe por fila** (ok / error con motivo) sin escribir nada; (2) **confirmar**: crea solo las filas válidas, reusando las RPC; devuelve el resumen (creadas / omitidas) y registra `log_event`. Importación = **solo alta** (no edita ni actualiza en v1).
- **Entidades del MVP (curadas, ADR-125):** las de onboarding/migración con RPC simple y bajo riesgo — **procesos, cargos, proveedores, requisitos legales**. Cada una con un **conjunto fijo de columnas** documentado y una **plantilla CSV descargable**. (Lista a confirmar por Fernando; ampliable después.)
- **Parseo CSV** con `@/lib/csv` (ya hay `toCsv`; se agrega un `parseCsv` mínimo, sin dependencia nueva): separador `;`/`,`, comillas, cabecera; límite de filas (p. ej. 1000) y de tamaño.

## 3. Alcance del MVP
| Feature | ¿v1.6-4? | Justificación |
|---|---|---|
| `GET /api/v1/me` (test de conexión Zapier/Make) | **Sí** | Requisito de esas plataformas |
| Guía de integración (triggers/acciones + recetas) | **Sí** | Habilita el no-code sin código por cliente |
| Importación CSV con previsualización (dry-run) + informe por fila | **Sí** | Núcleo del valor; reduce fricción de adopción |
| Entidades: procesos, cargos, proveedores, requisitos legales | **Sí (a confirmar)** | Onboarding/migración, RPC simples |
| Plantillas CSV descargables por entidad | **Sí** | Evita errores de formato |
| App publicada en el marketplace de Zapier/Make | No | Configuración/submission externa, no código |
| Importación que **edita/actualiza** (upsert) registros | No | Solo alta en v1 |
| Mapeo de columnas arbitrario en la UI | No | Columnas fijas por entidad en v1 |
| Nuevos eventos de webhook / endpoints de negocio nuevos | No | Se reusan los existentes |
| Importar NC/PQRS/mediciones por CSV | No | Ya entran por API; se evalúa luego |

**Camino dorado:** el admin abre **Administración → Importar**, elige "Proveedores", descarga la plantilla, sube el CSV → ve la **previsualización** (18 ok, 2 con error "proceso no encontrado") → corrige y **confirma** → se crean los 20 proveedores. En paralelo, conecta CrubolDocs en Zapier con su API key (validada por `/api/v1/me`) y crea un Zap "NC creada → Slack".

## 4. Mapa de rutas
- **`GET /api/v1/me`** — test de conexión (Bearer).
- **Administración → pestaña "Importar"** — selector de entidad, plantilla descargable, carga de CSV, previsualización con informe por fila, botón Confirmar. Solo Admin de organización o Líder SIG.
- Server actions `previewImport(entidad, csv)` y `commitImport(entidad, filas)` (reusan las RPC de creación).
- `docs/api/INTEGRACIONES.md` — guía Zapier/Make.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (parseo CSV propio; `/me` reusa la auth de API key existente).

**Top 3 riesgos y mitigación:**
1. **Carga masiva cruzada o maliciosa** → la importación corre como el usuario autenticado y pasa por las **RPC existentes** (RLS + autorización + validación por `organization_id`); nunca acepta un `org` del CSV; límite de filas/tamaño; `toCsv`/parseo neutralizan fórmulas.
2. **Importación parcial/inconsistente** → **dry-run** obligatorio con informe por fila antes de escribir; en el commit, cada fila es independiente y se reporta (creadas/omitidas); sin fallos silenciosos; `log_event` por lote.
3. **Exposición por `/api/v1/me`** → solo devuelve id/nombre de la organización, scopes y nombre de la key (sin datos del negocio ni PII); misma autenticación Bearer + rate-limit que el resto de la API.

## ADRs

### ADR-124 — El "app de Zapier/Make" se habilita, no se programa por cliente
**Contexto:** una app de Zapier/Make se define en sus plataformas sobre una API; publicarla es un proceso externo.
**Decisión:** en el código solo se agrega `GET /api/v1/me` (test de conexión) y una guía de recetas; triggers = webhooks existentes, acciones = POST existentes. Sin endpoints de negocio nuevos.
**Consecuencias:** integración no-code sin trabajo por cliente ni superficie nueva; la publicación en marketplace queda como tarea externa.

### ADR-125 — Importación CSV curada que reutiliza las RPC de creación
**Contexto:** cargar en bloque sin duplicar reglas ni saltarse la autorización.
**Decisión:** importación como server action del usuario autenticado que llama a las RPC de creación existentes por fila (procesos, cargos, proveedores, requisitos legales); solo alta; columnas fijas por entidad; sin tablas nuevas.
**Consecuencias:** misma seguridad y trazabilidad que la app; alcance acotado y ampliable.

### ADR-126 — Importación en dos pasos (previsualizar → confirmar)
**Contexto:** evitar cargas parciales silenciosas y errores de formato.
**Decisión:** paso 1 dry-run que valida y resuelve referencias con informe por fila (sin escribir); paso 2 confirma y crea solo las válidas, con resumen y `log_event`.
**Consecuencias:** el usuario corrige antes de escribir; resultado predecible; sin transacción global (cada fila independiente, reportada).

---

## Decisiones que necesito de ti (para fijar el alcance)
1. **Framing del "app de Zapier/Make":** en código solo `/api/v1/me` + guía de recetas; la app y su publicación en marketplace son externas. *Recomiendo así.*
2. **Entidades de importación CSV del MVP:** **procesos, cargos, proveedores, requisitos legales**. ¿Agrego/quito alguna (p. ej. peligros SST, aspectos ambientales)?
3. **Solo alta (sin actualizar/upsert) en v1.** *Recomiendo sí.*
4. **Ubicación:** Administración → pestaña **"Importar"** (centralizada), no un botón por módulo. *Recomiendo sí.*
5. **Columnas fijas por entidad + plantilla descargable** (sin mapeo arbitrario en v1). *Recomiendo sí.*
6. **Rol:** Admin de organización o Líder SIG para importar. *Recomiendo sí.*
7. **Fuera del MVP:** publicación en marketplace, upsert por CSV, mapeo de columnas, nuevos eventos/endpoints, importar NC/PQRS/mediciones por CSV. ¿De acuerdo?

**Siguiente:** tu aprobación (PARADA) → **diseño** (pestaña Importar + previsualización + guía). Luego backend/datos, seguridad, deploy. Con esto cierra **v1.6 (4/4)**.
