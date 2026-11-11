# Arquitectura — Contexto de la organización (ISO 9001 4.1 / 4.2)

**Producto:** CrubolDocs · **Feature:** v1.3-1 (primero del roadmap v1.3) · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema que resuelve:** ISO 9001 cap. 4 exige determinar las **cuestiones internas y externas** (4.1) y las **partes interesadas** pertinentes y sus **requisitos** (4.2). Hoy CrubolDocs no cubre esta cláusula; las suites del mercado (ISOTools, KAWAK) sí la venden. Cerrarla sube la "completitud de la norma" y es un argumento comercial directo.
- **Acción de valor:** documentar el análisis de contexto (DOFA + PESTEL) y el registro de partes interesadas, y **conectarlos con el SGC** — una amenaza/debilidad puede **generar un riesgo**, una cuestión puede **atenderse con un objetivo**, y una parte interesada puede **ligarse a un requisito legal**. Así el cap. 4 deja de ser un documento muerto.
- **Cobro:** incluido en la suite (sin cobro en v1).
- **Mercado:** Colombia/LatAm, pymes con SGC. Dato personal: las partes interesadas pueden nombrar personas (contacto); se minimiza y entra en la política de datos.

## 2. Modelo de dominio
Multi-tenant por `organization_id` (reusa `organizations`/`memberships`/`positions`/`processes`). Dos entidades nuevas.

### `context_issues` — cuestiones del contexto (4.1)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | |
| swot | text CHECK in ('fortaleza','debilidad','oportunidad','amenaza') | fortaleza/debilidad = **interna**; oportunidad/amenaza = **externa** (el ámbito se deriva) |
| pestel | text CHECK in ('politico','economico','social','tecnologico','ecologico','legal') NULL | solo para cuestiones **externas** (oportunidad/amenaza); null en internas |
| description | text NOT NULL | la cuestión |
| implication | text NULL | implicación/efecto esperado en el SGC |
| process_id | uuid NULL → processes (id, org) | proceso pertinente (opcional) |
| risk_id | uuid NULL → risks (id, org) | riesgo generado desde esta cuestión (ADR-061) |
| objective_id | uuid NULL → objectives (id, org) | objetivo con que se atiende (opcional) |
| status | text CHECK in ('vigente','archivada') default 'vigente' | baja lógica |
| created_by | uuid default auth.uid() | |
| created_at / updated_at | timestamptz | |

FKs compuestas `(id, organization_id)`; índices por `(organization_id, swot)`. **Sin código consecutivo** (no es un registro formal tipo NC; es un ítem de matriz) — ADR-060.

### `interested_parties` — partes interesadas (4.2)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid NOT NULL → organizations | |
| name | text NOT NULL | nombre de la parte (p. ej. "Clientes", "ANLA", "Proveedor X") |
| party_type | text CHECK in ('cliente','proveedor','empleado','accionista','autoridad','comunidad','otro') | |
| needs_expectations | text NULL | necesidades y expectativas |
| requirements | text NULL | requisitos que impone |
| monitoring | text NULL | cómo se le da seguimiento |
| process_id | uuid NULL → processes (id, org) | |
| legal_requirement_id | uuid NULL → legal_requirements (id, org) | requisito legal asociado (opcional) |
| status | text CHECK in ('vigente','archivada') default 'vigente' | |
| created_by | uuid default auth.uid() | |
| created_at / updated_at | timestamptz | |

**Dato personal** (contacto de la parte): se captura solo si aplica, minimizado. Sin código.

### Integraciones (reutilizar, no reinventar)
- **Cuestión → Riesgo:** RPC `generate_risk_from_issue` reutiliza el patrón de `create_risk` (proceso + responsable + descripción) y enlaza `risk_id`; idempotente (ADR-061).
- **Parte interesada → Requisito legal:** FK opcional `legal_requirement_id`.
- **Cuestión → Objetivo:** FK opcional `objective_id` (el objetivo ya existe; aquí solo se referencia).
- **Auditoría:** `log_event` en cada mutación (entity_type `Contexto` / `ParteInteresada`).
- **Revisión por la dirección:** el contexto es una **entrada** de 9.3; leer el contexto en el acta queda **diferido** (sin hueco; solo lectura futura).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Matriz DOFA (4 cuadrantes) | **Sí** | Núcleo de 4.1 |
| Clasificación PESTEL en cuestiones externas | **Sí** | Decisión de Fernando (DOFA + PESTEL completo) |
| Partes interesadas + necesidades/expectativas + seguimiento | **Sí** | Núcleo de 4.2 (decisión de Fernando) |
| Generar riesgo desde una cuestión | **Sí** | El valor 4.1→6.1; reusa riesgos |
| Ligar parte interesada → requisito legal y cuestión → objetivo | **Sí** | Vínculos (decisión de Fernando); FKs opcionales |
| Baja lógica (vigente/archivada) + filtros | **Sí** | Coherente con los demás módulos |
| Exportar CSV (cuestiones y partes) | **Sí** | Paridad con el resto |
| Versionado/snapshot del contexto por periodo | No | Se difiere; la revisión usa el estado vigente |
| Mapa/gráfico DOFA-PESTEL interactivo | No | La matriz en tarjetas cubre el MVP |
| Leer contexto dentro de la Revisión por la dirección | No | Diferido, sin hueco |
| Adjuntos | No | Coherente con los últimos módulos |

**Camino dorado:** entrar a `/app/contexto` → registrar una **amenaza externa** (PESTEL: legal) → **generar un riesgo** desde ella → registrar una **parte interesada** (autoridad) con su requisito → ligarla a un **requisito legal**. Contexto documentado y conectado al SGC.

## 4. Mapa de rutas
- **`/app/contexto`** (privada) — una sola ruta con **2 secciones** (decisión de Fernando):
  - **Análisis de contexto** (DOFA + PESTEL): matriz de 4 cuadrantes, filtros, Sheet "Nueva cuestión", acción "Generar riesgo".
  - **Partes interesadas**: lista con tipo/requisitos, Sheet "Nueva parte", enlace a requisito legal.
  - **Ve:** roles del SIG (`canSeeContext`). **Gestiona:** Líder SIG o Líder del proceso (`canManageContext`).
- Ítem de menú nuevo "Contexto" (ícono tipo brújula/compass), ubicado al inicio del bloque del SGC (es el cap. 4, base del sistema).

## 5. Integraciones y riesgos
**Servicios externos:** ninguno nuevo (sin dependencias nuevas; sin IA en este MVP).

**Top 3 riesgos técnicos y mitigación:**
1. **Sobrecarga de diligenciamiento** (PESTEL completo puede cansar) → todos los campos de clasificación/implicación **opcionales**; la matriz muestra solo lo esencial; PESTEL es una etiqueta, no un formulario aparte.
2. **Vínculos huérfanos** (riesgo/objetivo/requisito borrado o archivado) → FKs `on delete set null` + baja lógica; la UI resuelve el nombre y degrada con gracia si el destino ya no existe.
3. **Confusión 4.1 vs 4.2** → dos secciones separadas y rotuladas, con textos guía; la cuestión del contexto no se mezcla con la parte interesada.

## ADRs

### ADR-060 — Cuestiones y partes sin código consecutivo; baja lógica
**Contexto:** los demás módulos usan numeración atómica (NC-, R-, CAP-…), pero el contexto es una **matriz** que se revisa y depura, no un registro formal rastreable por folio.
**Decisión:** `context_issues` e `interested_parties` **no** llevan código; se identifican por descripción/nombre y se dan de baja lógicamente (`status` vigente/archivada). Sin tabla de contadores.
**Consecuencias:** modelo más liviano; no hay trazabilidad por folio (no se necesita); el histórico se conserva por `audit_log` y la baja lógica.

### ADR-061 — Generar riesgo desde una cuestión del contexto (4.1 → 6.1)
**Contexto:** el valor de 4.1 es que las amenazas/debilidades se gestionen como riesgos, no que queden en un papel.
**Decisión:** RPC `generate_risk_from_issue(issue, process, owner, …)` `SECURITY DEFINER` que reutiliza la lógica de `create_risk`, crea el riesgo con la descripción de la cuestión y enlaza `risk_id`. **Idempotente** (si ya tiene riesgo, falla). Autorización por `can_manage_risk` del proceso.
**Consecuencias:** integración real 4.1→6.1 sin duplicar el motor de riesgos; una cuestión genera a lo sumo un riesgo; el resto de valoración/controles se hace en el módulo de riesgos.

### ADR-062 — Escritura por RPC + RLS solo-SELECT (patrón del proyecto)
**Contexto:** todos los módulos (1–20, APTO) usan RLS solo-SELECT por `organization_id` y escritura por RPC `SECURITY DEFINER` con `search_path=''` y autorización interna por rol.
**Decisión:** el módulo Contexto sigue el mismo patrón; RPCs `create/update/set_*_archived` + `generate_risk_from_issue`; FKs compuestas `(id, organization_id)`; `revoke public/anon` + `grant authenticated`; `log_event` en cada mutación.
**Consecuencias:** coherencia y auditabilidad con el resto; la fase de seguridad es un espejo de las anteriores.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (specs de `/app/contexto`). Luego #2 Caracterización de procesos.
