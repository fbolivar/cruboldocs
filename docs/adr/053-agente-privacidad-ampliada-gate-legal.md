# ADR-053 — Crubol-Agent Fase C: ampliación de la declaración de privacidad y gate legal

## Contexto
La declaración de privacidad vigente (aprobada por el abogado el 2026-11-10: `/tratamiento-de-datos` §6 y
`/terminos` §9) autoriza enviar a Anthropic **solo datos del catálogo** (procesos/tipos/cargos). La Fase C
envía **contenido del SGC** (descripción de NC y riesgos, bajo demanda), un **nuevo alcance de datos** a un
sub-encargado en EE. UU. Esto es una decisión de cumplimiento (Ley 1581), no técnica.

## Decisión
Antes de **activar** la Fase C para clientes se debe **ampliar** la declaración: `/tratamiento-de-datos` §6
y `/terminos` §9 describirán el envío del **contenido del registro (NC/riesgo) que el usuario abra y para
el que pida ayuda, bajo demanda, minimizado y sin PII del cliente**, con **revisión legal del abogado de
Fernando**. Mientras tanto (decisión de Fernando, 2026-11-11) se **avanza** arquitectura → diseño →
backend/UI **detrás de la bandera opt-in, desactivado por defecto**; la activación para cualquier
organización **espera el OK legal**. Se mantiene opt-in por organización y API comercial (no-entrenamiento).

## Consecuencias
- Se puede construir y auditar la feature sin bloquearse por lo legal; el riesgo de cumplimiento queda
  contenido porque no se activa hasta el OK.
- La minimización (sin PII, solo el registro abierto) reduce el alcance que el abogado debe aprobar.
- Si el abogado exige condiciones extra (p. ej. consentimiento por registro), se incorporan antes de
  activar. Ver [ADR-051] (minimización) y [ADR-052] (ejecución/límites).
