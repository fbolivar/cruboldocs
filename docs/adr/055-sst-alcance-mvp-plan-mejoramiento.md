# ADR-055 — SG-SST: alcance del MVP (autoevaluación + plan de mejoramiento; plan anual e indicadores diferidos)

## Contexto
El SG-SST completo incluye, además de la autoevaluación de estándares, el **plan de trabajo anual** y
los **indicadores SST** (frecuencia, severidad, ausentismo, mortalidad). Hacer todo en un solo MVP es
grande; la skill de arquitectura pide **cortar agresivo**. Fernando decidió (2026-11-11) el alcance.

## Decisión
El MVP cubre: **autoevaluación** de Estándares Mínimos (los 3 niveles), **puntaje y valoración** (server-
side, ADR-054) y, para cada estándar **No cumple**, un **plan de mejoramiento** (`sst_actions`:
descripción, responsable, plazo, estado) con **recordatorios por el cron** (tarea `cumplir_mejora_sst`,
entity `sst`), reusando el patrón de tareas de los demás módulos. Enlace **suave** a Peligros/GTC-45
(componente "Peligros y riesgos", 30%). Se **difieren**: el **plan de trabajo anual del SG-SST**, los
**indicadores SST** (se reusará el módulo de Indicadores), la generación de documentos y el reporte a la
ARL/Ministerio, y cualquier **dato de salud individual** (PII sensible, fuera de alcance).

## Consecuencias
- Entrega el **núcleo defendible** (lo que pide la norma para la autoevaluación anual) con esfuerzo
  acotado, reusando tareas/cron y el cálculo server-side.
- El plan de trabajo anual y los indicadores SST llegan como fases siguientes sin re-arquitectura.
- Sin PII sensible en el MVP: menor superficie de cumplimiento. Ver [ADR-054].
