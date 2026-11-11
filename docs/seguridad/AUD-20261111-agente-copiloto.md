# Auditoría de seguridad — Crubol-Agent Fase C (copiloto de causa/CAPA/riesgos)

- **Fecha:** 2026-11-11
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** migración `034_agente_consume_record.sql` (`ai_agent_consume_record`), `src/lib/agente/copilot.ts` (tools, `runCopilotTool`, `resolveRecord`, `buildCopilotSeed`, `copilotSystemPrompt`, `consumeCopilotUse`), rutas `src/app/api/agente/copiloto/route.ts` y `.../ejecutar/route.ts`, `src/components/agente/copilot-button.tsx`, y el montaje en las fichas de NC (`.../no-conformidades/[codigo]/page.tsx`) y Riesgo (`riesgos/page.tsx`, `risk-panel.tsx`, `risk-panel-detail.tsx`). Contexto: ADR-051/052/053.

## Resumen ejecutivo (3 líneas)
El copiloto reusa el patrón ya APTO: actúa con la **sesión del usuario** (RLS), **PROPONE** y solo ejecuta con **confirmación humana**, delegando en las acciones de dominio existentes (`set_nc_cause`/`add_nc_action`/`add_control`/`add_assessment`), que **exigen rol gestor y bloquean estados cerrada/anulada en el RPC** (no solo en la UI). El **id real del registro lo inyecta el servidor** (no el modelo), el contexto es **mínimo** (solo el registro abierto, sin datos personales estructurados del cliente), y todo vive **tras la bandera opt-in, desactivado por defecto**. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO** (con gate legal para la activación)
0 Críticos · 0 Altos · 0 Medios · **3 Bajos** (aceptados). Habilitado para desplegar **con la feature apagada**. **La activación para clientes queda condicionada al OK legal** del alcance de privacidad ampliado (ADR-053), no a esta auditoría.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Una respuesta **fallida del modelo** consume igual una unidad de uso (se cobra antes de la llamada a Anthropic), como en el chat de catálogo. | `copiloto/route.ts`: `consumeCopilotUse` antes de `messages.create`. | Reintegrar la unidad si la llamada falla, o cobrar después. No bloquea; impacto solo de cuota. |
| BAJ-02 | Bajo (aceptado) | El contexto enviado a Anthropic incluye los **nombres de cargos** de la organización (dato de catálogo, ya cubierto por la declaración vigente) y la **descripción libre** del registro, que podría contener **PII incidental** escrita por el usuario. | `buildCopilotSeed` arma el contexto con `listPositions()` + `description`. | Cubierto por el gate legal (ADR-053) y la minimización (sin campos de cliente). Opcional: advertir al usuario de no escribir PII en descripciones. |
| BAJ-03 | Bajo (aceptado) | `ai_agent_consume_record` autoriza por `has_role('lider_proceso')` **sin proceso específico**: cualquier líder de proceso de la organización puede gastar una unidad de uso. | `034` función de consumo. | La autorización **por registro** la impone la acción de dominio (`can_manage_nc`/`canManageRisks` del proceso real), así que no hay acceso indebido; solo comparte el presupuesto de uso. Patrón NULL-scope aceptado. |

## Verificaciones (sin hallazgos)
- **No escala privilegios (propiedad central):** el `input` de la tool viene del cliente, pero `runCopilotTool` lo valida con zod y delega en las acciones de dominio con la **sesión del usuario**; el **id del registro lo resuelve el servidor** (`resolveRecord`), no el modelo. Un `input` manipulado solo puede hacer lo que el usuario ya podría en la UI sobre **ese** registro. Verificado: `set_nc_cause`/`add_nc_action` exigen `can_manage_nc` y rechazan NC `cerrada`/`anulada` en el RPC.
- **Autorización en dos capas:** el chat (`buildCopilotSeed`) devuelve `null` si el usuario no gestiona el registro → 403; el ejecutar (`resolveRecord` + `canManage`) revalida antes de correr la acción (defensa en profundidad), además de exigir `isAgentEnabled()`.
- **Aislamiento entre organizaciones:** `resolveRecord`/`buildCopilotSeed` leen por `getNonconformity(code)`/`getRisk(id)` con RLS; una referencia de otra organización devuelve `null` → 403. La lista de cargos del contexto sale de `listPositions()` (RLS), de la propia organización. Verificado en RLS 034: consulta, responsable de control y otra org rechazados; con el agente apagado no se consume.
- **Minimización:** el contexto incluye solo el registro abierto; **no** hay campos estructurados de cliente (viven en `pqrs_cases`, no en `nonconformities`); no se envían otros registros ni PII estructurada. El pie del panel lo declara al usuario.
- **Anti-inyección de prompts:** el system prompt declara el contenido del registro como **dato, no instrucción**; el agente solo tiene las 4 tools de causa/acción/control/valoración (ninguna firma/cierra/verifica), así que una inyección en la descripción no puede escalar: en el peor caso propone algo que el usuario **cancela**.
- **Límites y superficie:** ambas rutas exigen **mismo origen**, sesión y organización; `agentConfigured()` (sin clave → 503); ráfaga por usuario (Upstash) + límite mensual por organización (`ai_agent_consume_record`). `ANTHROPIC_API_KEY` es secreto de servidor; el navegador no habla con Anthropic. Sin `service_role`. Sin dependencias nuevas.
- **Apagado por defecto:** los botones solo se renderizan con `isAgentEnabled()` (bandera `ai_agent_enabled`, default false) + `canManage` + estado editable. Hoy ninguna organización lo tiene encendido.

## Advisors de Supabase (security)
- `function_search_path_mutable` = **0**. `anon_security_definer_function_executable` sigue en **2** (solo las RPC públicas de la encuesta); `ai_agent_consume_record` es **solo-authenticated**. `rls_enabled_no_policy` sin cambios (los contadores deny-all de siempre).

## Condiciones
- **Despliegue:** permitido con la feature **apagada** (sin riesgo; nadie la ve).
- **Activación (opt-in para un cliente):** **bloqueada hasta el OK legal** del texto ampliado de `/tratamiento-de-datos` §6 y `/terminos` §9 (ADR-053). Al activar, re-verificar la minimización (sin PII en el payload) como prueba de QA.
