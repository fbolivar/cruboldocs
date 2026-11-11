# ADR-057 — Gestión del cambio (6.3): flujo con estados y aprobación por rol

## Contexto
ISO 9001 (6.3) exige planificar los cambios del SGC: propósito y consecuencias, integridad del sistema,
recursos y responsabilidades. El auditor espera un registro de cambios con su evaluación y aprobación
trazables.

## Decisión
`change_requests` guarda la solicitud (código CMB-AAAA-###, título, descripción, tipo, proceso,
solicitante, **análisis de impacto** en texto: riesgos/recursos/responsabilidades, aprobador, decisión,
notas de implementación) con una **máquina de estados**: propuesto → en_evaluacion → (aprobado |
rechazado); aprobado → implementado. Cada transición por RPC `SECURITY DEFINER` con autorización por rol;
**aprobar/rechazar = Líder SIG**. RLS solo-SELECT + escritura por RPC. Numeración atómica. El **enlace a
riesgos/NC se difiere** (un cambio podría generar riesgo; se evaluará en una fase siguiente).

## Consecuencias
- Registro de cambios defendible, con evaluación de impacto y aprobación trazable (espejo del stepper de
  NC/PQRS, ya APTO).
- El análisis de impacto es texto en v1; estructurarlo (matriz) es un incremento posterior.
- Sin enlace automático a riesgos en v1. Ver [ADR-056].
