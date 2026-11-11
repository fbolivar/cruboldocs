# ADR-052 — Crubol-Agent: ejecución por tools con confirmación que reusan las acciones de dominio

## Contexto
Fernando decidió (2026-11-11) que el copiloto no solo **sugiera**, sino que **ejecute con confirmación**
(como ya hace el agente de catálogo). El reto es ejecutar escritura sin que el agente obtenga privilegios
extra ni toque actos con valor probatorio (firma/cierre/verificación de eficacia, ADR-004).

## Decisión
El agente dispone de tools acotadas (`sugerir_causa_nc`, `proponer_accion_capa`, `sugerir_control`,
`sugerir_valoracion`) que, al **confirmarse**, invocan las **mismas acciones de dominio que la UI**
(`setNcCause`, `addNcAction`, `addControl`, `addAssessment`) con la **sesión del usuario** → RLS y
guardas de rol. Cada escritura muestra una **tarjeta de confirmación** (human-in-the-loop). El agente
**no** tiene tools para verificar eficacia, cerrar, aprobar ni cambiar estados; esos actos siguen siendo
del usuario con reautenticación. El contenido del registro es **dato, no instrucción** (blindaje
anti-inyección). Opcional: marcar en el `meta` del evento de `audit_log` que la acción fue **"asistida por
IA"**, sin tabla nueva.

## Consecuencias
- El agente nunca escala privilegios: si el usuario no puede gestionar esa NC/riesgo, la tool falla igual.
- Reusa la lógica ya probada y auditada (una sola ruta de escritura por dominio).
- Una inyección de prompt desde la descripción no puede firmar/cerrar: no existe esa tool.
- La trazabilidad "asistido por IA" permite auditar el uso del copiloto. Ver [ADR-051] y [ADR-053].
