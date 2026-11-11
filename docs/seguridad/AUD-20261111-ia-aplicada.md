# Auditoría de seguridad — IA aplicada en el SGC (v1.5-1)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 054 (`ai_content_consume`), motor `src/lib/agente/content.ts` (prompts + autorización por tarea), server action `suggestWithAi`, componentes de IA (`SuggestWithAi`, `AiSummaryDialog`, `AiDocumentDraftDialog`) y su cableado en NC/auditoría/acta/documentos.

## Resumen ejecutivo (3 líneas)
La IA **solo devuelve texto**: nunca escribe en la base ni ejecuta acciones (ADR-104/105); el usuario revisa el borrador y lo guarda con las acciones ya auditadas. Cada generación **autoriza por tarea** (RLS + rol de la acción de fondo) y **consume 1 del cupo mensual por organización** (`ai_content_consume`, atómico, exige `is_active_member` + opt-in del agente, comparte el contador del copiloto). Los prompts llevan solo datos que el usuario ya puede ver, **sin PII del cliente** (el acta excluye asistentes), y tratan el contenido como DATO (anti-inyección). **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| IA-01 | Media | Costo descontrolado por abuso del modelo. | Cada `suggestWithAi` consume 1 del cupo mensual por organización (`ai_content_consume`, atómico, tope `AI_AGENT_MONTHLY_LIMIT`); sin clave o sin opt-in del agente, la generación falla y los botones no se muestran. | Mitigado |
| IA-02 | Media | Inyección de prompt / fuga del system prompt. | Los datos del registro van delimitados (`<<< … >>>`) y el system prompt instruye tratarlos como DATO, no ejecutar acciones y no revelarse; la IA no tiene herramientas ni escribe: la salida es solo texto. | Mitigado |
| IA-03 | Info | La IA recibe datos del SGC. | Solo datos que el usuario **ya puede ver** por RLS (se cargan con su cliente); el resumen de acta **excluye asistentes** (PII); los prompts no llevan nombre/contacto de clientes. | Aceptado |
| IA-04 | Info | Contenido impreciso/alucinado. | Toda salida es **borrador editable** rotulado "Borrador generado por IA — revísalo antes de guardar"; nada se publica sin la acción humana existente (guardar causa, agregar acción, subir documento). | Aceptado |

## Verificaciones realizadas
- **La IA no escribe ni ejecuta:** `generateDraft` solo llama al modelo y devuelve texto; no invoca RPC de escritura ni herramientas; el guardado lo hace el usuario con las acciones de dominio (RLS + guardas de rol ya auditadas).
- **Autorización por tarea:** NC (causa/acciones) exige `canManage` de la NC (cargado por RLS); auditoría `canManage`; acta `canManage`; documento exige rol elaborador/líder. Un registro de otra org no resuelve (RLS) → sin contexto, sin generación.
- **Costo/cupo:** `ai_content_consume` es `security definer`, atómico; exige `is_active_member` + `organizations.ai_agent_enabled`; comparte el contador `ai_agent_usage`; `anon` no puede ejecutarlo (revocado). Pruebas RLS 054: miembro consume y decrementa; otra org rechazada ("Sin acceso"); cupo agotado ("Límite de IA"); sin opt-in no consume; el contador se comparte con el copiloto.
- **Anti-inyección / PII:** contenido como DATO delimitado; sin asistentes en el acta; prompts con datos ya visibles para el usuario; `search_path=''`; sin superficie `anon` nueva (la lista anon sigue en 6).
- **Disponibilidad controlada:** los botones "Sugerir con IA" solo aparecen con el agente habilitado y el rol correspondiente (gate en servidor); misma `ANTHROPIC_API_KEY` server-only.

## Conclusión
El módulo se puede desplegar. Los dos hallazgos con impacto (costo IA-01, inyección IA-02) quedan mitigados; el resto son Info aceptados por diseño (ADR-103/104/105). La IA es asistiva y auditable: todo pasa por la revisión y las acciones humanas existentes.
