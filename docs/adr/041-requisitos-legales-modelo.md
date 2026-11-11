# ADR-041 — Requisitos legales: modelo con cumplimiento derivado de la última evaluación

## Contexto
14001/45001 (y SG-SST en Colombia) exigen una **matriz de requisitos legales** con **evaluación periódica** del cumplimiento. Hay que decidir si el cumplimiento es un campo que se teclea o se deriva del historial de evaluaciones, y cómo modelar el ciclo de vida del requisito.

## Decisión
Dos tablas espejo de Indicadores: **`legal_requirements`** (requisito: fuente, referencia, qué exige, proceso, frecuencia, `status` vigente/derogado) y **`legal_evaluations`** (historial: fecha, `compliance` cumple/parcial/no_cumple, evidencia, próxima evaluación), más el contador `REQ-AAAA-###`. El **cumplimiento vigente** y la **próxima evaluación** se **derivan de la última evaluación** (no se persiste un estado suelto); sin evaluaciones → "No evaluado". El requisito se retira con **baja lógica** `status='derogado'` (nunca DELETE, por el guard del MCP y para conservar historial).

## Consecuencias
- Un solo origen del estado (la última evaluación), sin desincronización; igual patrón que Indicadores/Proveedores.
- La matriz exportable (CSV) es el entregable para el auditor.
- Queda listo para recibir la **etiqueta de norma** del v1.1-4 sin reescritura (el `process_id` ya ancla el requisito a un proceso).
