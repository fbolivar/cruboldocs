# ADR-043 — Catálogo de normas por organización + etiquetado polimórfico

## Contexto
La suite debe pasar de "SGC de calidad" a **Sistema Integrado de Gestión** (9001/14001/45001 y normas propias). Hay que marcar el trabajo existente por norma sin reescribir los 10 módulos ni duplicar tablas.

## Decisión
Un catálogo **`norms`** por organización (sembrado con 9001/14001/45001 al activarlas; editable para normas propias) y una tabla **polimórfica** `entity_norms(norm_id, entity_type, entity_id, organization_id)` que etiqueta cualquier registro (proceso, documento, riesgo, NC, objetivo, requisito legal) con una o varias normas. La capa es **aditiva**: no se altera ninguna tabla existente; la integración (chip + filtro por norma) se hace módulo a módulo.

## Consecuencias
- Cero migración destructiva; extender a una entidad nueva es solo permitir otro `entity_type`.
- Los filtros "por norma" y el segmento del Tablero se alimentan de una sola tabla, con RLS por organización.
- Si se requiere jerarquía de normas o cláusulas, se amplía sin tocar lo marcado.
