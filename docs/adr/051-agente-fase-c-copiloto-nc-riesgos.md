# ADR-051 — Crubol-Agent Fase C: copiloto de causa/CAPA/riesgos con minimización por registro abierto

## Contexto
El MVP del agente (Fase A, desplegado) solo asiste el **catálogo** (procesos/tipos/cargos). El mercado
(Veeva, Qualityze, SoftExpert) ya mete la IA **dentro** de los flujos de CAPA y causa raíz. Fernando
decidió (2026-11-11) que la primera evolución del agente sea un **copiloto de causa raíz / CAPA /
riesgos**, y que lea **solo el registro abierto, bajo demanda** (no recuperación amplia).

## Decisión
En la ficha de una **No Conformidad** o de un **Riesgo**, el agente —a petición del usuario— recibe
**solo ese registro** y propone: análisis de causa y plan de acciones CAPA (NC); controles y valoración
(riesgo). El contexto se arma en el servidor desde lo que el usuario ya puede ver (RLS) y **excluye el
dato personal del cliente** (p. ej. `customer_name`/`customer_contact` en NC de `queja_pqrs`). No se
envían otros registros ni PII. No hay esquema nuevo: reusa `nonconformities`/`nc_actions`/`risks`/
`controls`/`risk_assessments`.

## Consecuencias
- Minimización fuerte: menor superficie de datos a Anthropic, menor costo, declaración de privacidad más
  acotada que una recuperación amplia.
- Sugerencias limitadas al registro abierto (no "NC similares"); suficiente para el MVP, ampliable luego.
- Obliga a filtrar PII del payload (verificable en QA). Ver [ADR-053] (privacidad/gate legal) y
  [ADR-052] (ejecución por tools con confirmación).
