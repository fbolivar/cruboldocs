# ADR-021 — Toma de conciencia (7.3) reutiliza la confirmación de lectura de documentos

## Contexto
ISO 7.3 (toma de conciencia) exige que las personas conozcan la política, los objetivos, su contribución y
las consecuencias de no cumplir. El módulo de control documental ya tiene **distribución con confirmación
de lectura obligatoria** (`confirm_read`, tareas `confirmar_lectura`): un documento se marca como leído por
los cargos destinatarios, con traza.

## Decisión
**No se construye un mecanismo nuevo de 7.3.** La toma de conciencia se evidencia reutilizando la
confirmación de lectura de documentos existente (la política, los objetivos y los procedimientos se
distribuyen y se confirman por esa vía). El Módulo 5 se concentra en 7.2 (competencia). En la ficha de la
persona se podrá, a futuro, **mostrar** un resumen de lecturas confirmadas, pero no es parte del MVP.

## Consecuencias
- Evita duplicar un flujo ya auditado y en producción.
- 7.3 queda cubierto operativamente; si un auditor exige un "registro de toma de conciencia" distinto, se
  evalúa como ampliación (no bloquea v1).
- La ficha de persona del Módulo 5 no depende del control documental para su MVP (acoplamiento bajo).
