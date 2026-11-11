# Arquitectura — Caracterización de procesos (ISO 9001 4.4)

**Producto:** CrubolDocs · **Feature:** v1.3-2 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** ISO 9001 4.4 exige determinar los procesos, sus **entradas/salidas**, secuencia e interacción, criterios y recursos. Hoy los procesos existen solo como **catálogo** (código, nombre, tipo, líder); no hay **caracterización** ni un lugar que muestre, por proceso, lo que ya está ligado (indicadores, riesgos, documentos, objetivos). Las suites (ISOTools, KAWAK) venden "mapa de procesos" y "caracterización".
- **Acción de valor:** una **ficha de proceso** que (a) caracteriza el proceso (objetivo, alcance, entradas/proveedores, salidas/clientes, recursos, PHVA, responsable) y (b) **agrega en un solo lugar** lo que ya cuelga del `process_id` (indicadores, riesgos, documentos, objetivos, requisitos legales, partes interesadas, cuestiones del contexto). Es la pieza que **une** el SGC alrededor del proceso.
- **Cobro:** incluido en la suite.
- **Mercado:** Colombia/LatAm. Sin dato personal nuevo (el responsable es un cargo, no una persona).

## 2. Modelo de dominio
Se **extiende la tabla existente `processes`** con la caracterización (ADR-063); no hay entidad nueva.

### Columnas nuevas en `processes` (todas nullable)
| Campo | Tipo | Notas |
|---|---|---|
| objective | text | objetivo del proceso |
| scope | text | alcance |
| inputs | text | entradas |
| suppliers | text | proveedores (de las entradas) |
| outputs | text | salidas |
| clients | text | clientes (de las salidas) |
| resources | text | recursos necesarios |
| phva_plan / phva_do / phva_check / phva_act | text | actividades por ciclo PHVA |
| characterized_at | timestamptz NULL | marca de última caracterización |

El **responsable** reutiliza `leader_position_id` (ya existe). El catálogo (código, nombre, tipo, líder) **no cambia**: se sigue administrando en `/app/admin` (ADR-065).

### Agregación (solo lectura, por `process_id`) — ADR-064
La ficha muestra conteos y enlaces a lo ya ligado: `indicators`, `risks`, `documents`, `quality_objectives`, `legal_requirements`, `interested_parties`, `context_issues`. No se duplica nada; se consulta por `process_id`, respetando la RLS de cada módulo.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Caracterización completa (objetivo, alcance, entradas/proveedores, salidas/clientes, recursos, PHVA, responsable) | **Sí** | Núcleo de 4.4 (decisión de Fernando) |
| Ficha de proceso que agrega indicadores/riesgos/documentos/objetivos del proceso | **Sí** | El valor "une todo" (decisión de Fernando) |
| Mapa de procesos agrupado por tipo (estratégico/misional/apoyo/evaluación) | **Sí** | Presentación (decisión de Fernando) |
| Exportar la caracterización (CSV) | **Sí** | Paridad |
| Edición por Líder SIG o Líder del proceso | **Sí** | Decisión de Fernando |
| Versionado/aprobación de la caracterización | No | Se difiere; la caracterización vive en la ficha (sin hueco) |
| Diagrama interactivo (flechas entre procesos) | No | El mapa por columnas cubre el MVP |
| SIPOC formal / fichas imprimibles en PDF | No | Entra con v1.3-3 (Informes PDF) |

**Camino dorado:** `/app/procesos` → ver el mapa por tipo → entrar a un proceso → **caracterizarlo** (objetivo, entradas/salidas, PHVA) → ver en la misma ficha sus **indicadores, riesgos, documentos y objetivos** ligados, con enlaces.

## 4. Mapa de rutas
- **`/app/procesos`** (privada): mapa de procesos agrupado por tipo; cada tarjeta muestra código, nombre, líder y conteos rápidos. **Ve:** roles del SIG (`canSeeProcessMap`).
- **`/app/procesos/[codigo]`** (privada): ficha de caracterización + agregación. **Edita la caracterización:** Líder SIG o Líder del proceso (`canManageProcess`). El resto ve en solo lectura.
- Ítem de menú "Procesos" (ícono tipo workflow/red), junto a Contexto (ambos son la base del SGC, cap. 4).

## 5. Integraciones y riesgos
**Servicios externos:** ninguno nuevo (sin dependencias, sin IA).

**Top 3 riesgos técnicos y mitigación:**
1. **No romper el catálogo de Admin** (processes se administra allí) → las columnas son **nullable**, el alta/baja sigue en Admin, y la caracterización se edita por un **RPC propio** (`update_process_characterization`), sin tocar los flujos existentes.
2. **Costo de la agregación** (varios conteos por proceso) → los conteos se hacen **solo en la ficha** (no en el mapa) con consultas `head`/count acotadas por `process_id`.
3. **Confusión "crear proceso" vs "caracterizar"** → la ficha solo caracteriza; copy claro y enlace a Admin para el catálogo.

## ADRs

### ADR-063 — Caracterización como columnas en `processes` (no entidad versionada)
**Contexto:** la caracterización 4.4 pertenece al proceso; crear una entidad versionada aparte duplicaría el motor de control documental.
**Decisión:** extender `processes` con columnas nullable de caracterización; el responsable reutiliza `leader_position_id`. Sin versionado (diferido).
**Consecuencias:** modelo simple y sin duplicación; no hay historial de versiones de la caracterización (se acepta; `audit_log` registra los cambios).

### ADR-064 — La ficha agrega lo ya ligado por `process_id`
**Contexto:** indicadores, riesgos, documentos, objetivos, requisitos legales, partes y cuestiones ya se ligan a un proceso; faltaba un lugar que lo reúna.
**Decisión:** la ficha de proceso consulta por `process_id` (respetando la RLS de cada módulo) y muestra conteos + enlaces; no copia datos.
**Consecuencias:** la ficha es el "centro del proceso" y vende la integración; depende de la RLS de cada módulo (quien no ve riesgos, no ve su conteo).

### ADR-065 — Edición por RPC; el catálogo sigue en Admin
**Contexto:** `processes` se crea/edita/borra en `/app/admin` por Admin/Líder SIG; la caracterización debe poder editarla el Líder del proceso sin darle el catálogo.
**Decisión:** `update_process_characterization(p_process, …)` `SECURITY DEFINER`, autorizado por `can_manage_process` (Líder SIG o Líder del proceso). El alta/baja del proceso no cambia.
**Consecuencias:** separación de funciones clara; dos caminos de escritura sobre `processes` (catálogo en Admin, caracterización por RPC), ambos con autorización propia.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (specs de `/app/procesos` y la ficha). Luego #3 Informes PDF + tablero configurable.
