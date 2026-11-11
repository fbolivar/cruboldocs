# ADR-042 — Reevaluación periódica por frecuencia + tarea del job diario

## Contexto
Los requisitos deben reevaluarse periódicamente; el auditor revisa que la evaluación esté al día. Hay que decidir cómo se dispara el recordatorio sin construir superficie nueva.

## Decisión
Cada requisito tiene `eval_frequency` (semestral/anual/bienal); al registrar una evaluación, el servidor calcula `next_eval_date`. El **job diario** (`run_daily_jobs`, service_role) crea una **tarea `evaluar_requisito`** (entity_type `requisito_legal`) para el Líder del proceso (o el Líder SIG) cuando `next_eval_date` está vencida, de forma idempotente — reutilizando el mecanismo de tareas+cron ya probado en documentos/proveedores/PQRS/compromisos. El requisito **incumplido → NC** y los **adjuntos** de la norma quedan **diferidos** (se añaden con su propia auditoría, como en los módulos previos).

## Consecuencias
- Cero superficie nueva de notificación; el recordatorio entra en la bandeja existente.
- La matriz "se mantiene viva" sin intervención manual de seguimiento.
- Cuando se quiera, un requisito `parcial`/`no_cumple` podrá abrir una NC con un clic (reutilizando `report_nonconformity`), coherente con el resto de la suite.
