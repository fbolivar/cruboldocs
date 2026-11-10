# ADR-008 — Verificación de eficacia obligatoria y reapertura

## Contexto
ISO 9001 (10.2) exige revisar la **eficacia** de las acciones correctivas, no solo ejecutarlas. Una
NC no debería cerrarse porque "ya se hicieron las acciones", sino porque alguien verificó que el
problema no se repite. Falta decidir cómo modelar un resultado "no eficaz": como estado terminal
aparte, o volviendo al plan de acción.

## Decisión
La transición a `cerrada` solo ocurre vía `verify_nc(nc, effective, notes)`, que exige una decisión
explícita de eficacia (la hace el Líder SIG o el dueño de la NC). Si `effective=false`, la NC **vuelve
a `plan_accion`** e incrementa `reopened_count` (esto es lo que el flujo aprobado llama "Reabierta"),
en lugar de crear un estado terminal "no eficaz". El resultado y las notas de cada verificación se
guardan para la trazabilidad y para la revisión por la dirección (módulo 4).

## Consecuencias
- No se puede cerrar una NC sin verificación: es lo que pide el auditor externo.
- La reapertura reutiliza el mismo registro (misma NC, mismo código) en vez de abrir una nueva, con
  `reopened_count` como indicador de reincidencia.
- La verificación es un paso humano obligatorio; añade fricción deliberada al cierre.
