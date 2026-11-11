# Arquitectura — IA aplicada en el SGC (v1.5-1)

**Producto:** CrubolDocs · **Feature:** v1.5-1 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Anthropic SDK · Vercel.

> PARADA OBLIGATORIA: fija el **alcance y el costo** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** el mercado eQMS 2026 se mueve a IA que **redacta, resume y sugiere** (de reactivo a proactivo). CrubolDocs tiene un copiloto que solo cataloga; falta IA que ayude con el contenido del SGC.
- **Acción de valor:** botones **"Sugerir con IA"** que generan un **borrador editable** (nunca auto-aplican): causa raíz y acciones de una NC, resumen de una auditoría, resumen de un acta, y borrador de documento desde un prompt. El usuario revisa, edita y guarda con las acciones que ya existen.
- **Decisiones (Fernando):** (1) las **4 tareas**; (2) **Sonnet (claude-sonnet-5-5)** reusando el **contador mensual por organización** (1 generación = 1 acción del cupo `AI_AGENT_MONTHLY_LIMIT`); (3) disponible solo donde el **agente ya está habilitado** (misma `ANTHROPIC_API_KEY`, mismo opt-in del Superadmin).
- **Dato personal / costo:** la IA recibe datos del SGC (sin PII del cliente en los prompts de auditoría/acta/documento); el costo queda acotado por el cupo mensual por organización (ya existente).

## 2. Modelo / técnica
Reusa toda la infraestructura del agente (ADR del copiloto): cliente `anthropic()`, `AGENT_MODEL`, medición atómica y opt-in.

- **Sin tablas nuevas.** Las salidas de IA **no se persisten** como entidad propia: son borradores en un textarea; si el usuario guarda, el texto entra al **campo existente** (p. ej. `nonconformities.root_cause`, el texto de una acción, el contenido de un documento). El resumen de auditoría/acta se muestra en un diálogo con **Copiar** (y, si la entidad tiene un campo de notas/resumen, se puede guardar ahí).
- **Server action `generateDraft(task, input)`** (`src/lib/agente/content.ts`): (1) autoriza por tarea con el **mismo rol** que ejecuta la acción de fondo; (2) **consume 1 unidad** del cupo mensual vía `ai_content_consume(org, limit, period)` (nuevo RPC: exige `is_active_member` + agente habilitado + incrementa el **mismo** contador `ai_usage`, atómico); (3) carga el contexto con **RLS** (cliente del usuario); (4) arma el prompt de la tarea y llama a Sonnet; (5) **devuelve el texto**, nunca escribe.
- **Tareas y contexto (lista blanca):**
  - `nc_causa` / `nc_acciones`: descripción + proceso de la NC → borrador de causa raíz / 1–3 acciones sugeridas. Autz `can_manage_nonconformities`.
  - `auditoria_resumen`: hallazgos de la auditoría → resumen ejecutivo. Autz `can_manage_audits`.
  - `acta_resumen`: temas + compromisos del acta → resumen. Autz `can_manage_minutes`.
  - `documento_borrador`: prompt corto del elaborador → borrador de procedimiento/instructivo (largo acotado). Autz roles de `create_document`.
- **Modelo y tope:** Sonnet, `max_tokens` 1024 (resúmenes/causa) y ~1800 (documento). Una generación = 1 acción del cupo.
- **Seguridad de prompt (ADR-105):** todo texto de la organización (descripción de NC, hallazgos, acta, prompt) es **DATO, no instrucción**; cada prompt lo delimita e instruye ignorar instrucciones embebidas y no revelar el prompt (igual que el copiloto). Nunca se ejecutan acciones desde la IA: la salida es solo texto para revisión.

## 3. Alcance del MVP
| Feature | ¿v1.5-1? | Justificación |
|---|---|---|
| "Sugerir con IA": causa raíz + acciones de NC | **Sí** | Mayor valor/menor riesgo |
| Resumen de auditoría | **Sí** | Insumo de revisión por la dirección |
| Resumen de acta | **Sí** | Reusa actas |
| Borrador de documento desde prompt | **Sí** | Decisión de Fernando (largo acotado) |
| `ai_content_consume` (mismo cupo mensual) + opt-in reusado | **Sí** | Costo acotado, cero config nueva |
| Salida editable que el usuario guarda (nunca auto-aplica) | **Sí** | Humano decide (calidad/seguridad) |
| Persistir/trazar cada salida de IA como entidad | No | La traza queda al guardar en el campo real |
| Agente que ejecuta acciones por su cuenta (tool-use ampliado) | No | Fuera de alcance; se mantiene propuesta+confirmación |
| Calidad predictiva / scoring | No | Es v1.5-2 (otra feature) |
| Afinar modelo / Opus / RAG sobre documentos | No | Diferido |

**Camino dorado:** en una NC, el Líder SIG pulsa **"Sugerir causa raíz"** → la IA propone un borrador a partir de la descripción → el líder lo edita y lo guarda con la acción normal; luego **"Sugerir acciones"** le da 1–3 textos que agrega como acciones. · En una auditoría, **"Resumen con IA"** genera el resumen ejecutivo para copiar a la revisión por la dirección.

## 4. Mapa de rutas
- **Sin rutas nuevas.** Botones **"Sugerir con IA"** dentro de las pantallas existentes: ficha de NC (causa raíz y acciones), ficha de auditoría (resumen), ficha de acta (resumen), alta/edición de documento (borrador). Visibles solo si el agente está habilitado y el usuario tiene el rol de la acción.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (el SDK de Anthropic ya está).

**Top 3 riesgos y mitigación:**
1. **Costo descontrolado** → cada generación consume 1 del cupo mensual por organización (atómico, server-side); sin clave o sin opt-in, los botones no aparecen.
2. **Inyección de prompt / fuga del system prompt** → datos de la org delimitados como DATO; la IA nunca ejecuta acciones ni escribe en la base; salida solo-texto para revisión.
3. **Contenido impreciso/alucinado** → todo es **borrador editable** que el usuario revisa y aprueba; se rotula "Borrador generado por IA — revísalo antes de guardar"; no se publica nada sin la acción humana existente.

## ADRs

### ADR-103 — Reusar la infraestructura del copiloto (modelo, cupo, opt-in)
**Contexto:** ya existe cliente Anthropic, medición por organización y opt-in.
**Decisión:** la IA aplicada usa `anthropic()`+Sonnet, consume del mismo cupo mensual (nuevo RPC `ai_content_consume` que comparte el contador) y solo aparece con el agente habilitado.
**Consecuencias:** costo acotado y cero infraestructura nueva; el precio es que el cupo se comparte entre catálogo y contenido (aceptable; es el presupuesto de IA de la organización).

### ADR-104 — Salida solo-texto, sin persistencia propia
**Contexto:** evitar auto-aplicar y no inflar el modelo de datos.
**Decisión:** `generateDraft` devuelve texto; el usuario lo edita y guarda con las acciones existentes; no se crea entidad para la salida de IA.
**Consecuencias:** la traza queda en el campo real al guardar; simple y auditable. Contra: no hay historial de "qué sugirió la IA" (diferido).

### ADR-105 — IA sin acciones y a prueba de inyección
**Contexto:** la IA recibe texto de la organización.
**Decisión:** los datos son DATO, no instrucción; la IA nunca ejecuta ni escribe; autz por tarea con el rol de la acción de fondo; cupo consumido antes de llamar al modelo.
**Consecuencias:** superficie de IA acotada y segura; coherente con el copiloto.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (botones "Sugerir con IA" + estados de borrador). Luego backend, seguridad, deploy. Después v1.5-2 Calidad predictiva.
