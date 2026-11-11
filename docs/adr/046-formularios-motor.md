# ADR-046 — Motor de formularios: plantilla + campos + respuestas con valores jsonb

## Contexto
El constructor debe dejar que el cliente diseñe formatos arbitrarios (inspecciones, listas de verificación, formatos) y recolectar respuestas, sin programar y sin una tabla por formato.

## Decisión
Esquema genérico: `form_templates` (plantilla, categoría, proceso, estado, versión), `form_fields` (campos ordenados; 9 tipos: texto, texto largo, número, fecha, sí/no, selección, multiselección, puntaje, sección; con `options`/`config` en `jsonb`), `form_submissions` (respuesta con `template_version`) y `submission_values` (`field_id` → `value jsonb`). La **validación de cada valor** (tipo, requerido, opciones, cotas) se hace **en el servidor** contra el esquema de la versión; el cliente solo renderiza. Numeración `FORM-AAAA-###`.

## Consecuencias
- Un solo motor cubre infinitos formatos; no se crea una tabla por formulario.
- Los `jsonb` exigen validación server-side estricta (no confiar del cliente); se auditará.
- Tipos avanzados (adjunto, firma, condicional, fórmulas, grilla) se añaden luego sin cambiar el núcleo.
