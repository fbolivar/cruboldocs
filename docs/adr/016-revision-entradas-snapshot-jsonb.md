# ADR-016 — Entradas 9.3.2 como snapshot jsonb semiautomático

## Contexto
Las entradas de la revisión (9.3.2) son en parte datos que ya viven en CrubolDocs (no conformidades,
auditorías, indicadores, riesgos, documentos) y en parte información que no (satisfacción del cliente,
retroalimentación, desempeño de proveedores, recursos, mejora). El acta debe ser **evidencia del
momento** de la revisión: si mañana cambian los números de un módulo, el acta ya firmada no debe
cambiar.

## Decisión
Las entradas automáticas se calculan en el servidor y se guardan como un **`snapshot jsonb`** en la
fila del acta (recuento de NC abiertas/cerradas/eficaces, auditorías y hallazgos, % de cumplimiento de
indicadores, riesgos altos y controles a tiempo, documentos vigentes/por vencer, y el estado de las
acciones de la revisión previa). Las entradas que no viven en la app se guardan como **texto en un
`jsonb inputs`**. El snapshot se **recalcula** con un botón mientras el acta está en `borrador` y se
**congela al cerrar**. No se crean tablas de enlace por entrada.

## Consecuencias
- El acta es evidencia inmutable y autoconsistente aunque los módulos evolucionen.
- Menos acoplamiento y menos tablas: una foto `jsonb` en vez de 5 relaciones.
- El `jsonb` no tiene integridad referencial; es intencional (es una foto, no datos vivos). La forma
  del snapshot se versiona en el código que lo lee.
