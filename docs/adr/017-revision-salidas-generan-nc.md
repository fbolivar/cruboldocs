# ADR-017 — Salidas 9.3.3 y generación de NC desde una acción de mejora

## Contexto
ISO 9.3.3: la revisión produce **salidas** — decisiones y acciones de mejora, necesidades de cambio del
SGC y de recursos. Muchas de esas salidas deben ejecutarse y rastrearse; el Módulo 1 (No Conformidades/
CAPA) ya gestiona el ciclo de acciones con responsable, plazo, evidencia y verificación.

## Decisión
Las salidas se registran en `review_outputs` (tipo `decision`/`accion_mejora`/`recurso`/`cambio_sgc`,
descripción, responsable, plazo). Una salida de tipo `accion_mejora` puede **generar una NC con un
clic** mediante `generate_nc_from_output`, que reutiliza `report_nonconformity` con `source='mejora'`,
guarda el enlace en `review_outputs.nonconformity_id` y es **idempotente** (`for update` + verifica que
no tenga ya NC). Generar una **tarea** al responsable desde una salida queda **fuera del MVP** (la NC ya
crea sus propias tareas; una salida sin NC es por ahora un compromiso textual con responsable y plazo).

## Consecuencias
- Las acciones de mejora de la dirección entran al ciclo CAPA ya auditado, con trazabilidad revisión↔NC.
- No se duplica lógica de seguimiento de acciones.
- Las salidas que no son acción de mejora quedan como registro del acta; si luego se quiere que generen
  tareas, se añade sin romper el modelo.
