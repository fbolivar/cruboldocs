# ADR-050 — Aspectos ambientales: enlace a requisito legal, etiqueta 14001 y revisión

## Contexto
Un aspecto ambiental suele estar atado a una obligación legal (14001 9.1.2 / matriz legal) y pertenece al sistema 14001; además debe revisarse periódicamente.

## Decisión
`env_aspects.legal_requirement_id` enlaza (opcional, FK compuesta por organización) con `legal_requirements` (v1.1-3). El módulo se **etiqueta con 14001** vía `entity_norms` añadiendo `entity_type 'aspecto_ambiental'` (reutiliza la capa multi-norma del #4). La **revisión periódica** se recuerda con una tarea del job diario (reutiliza tasks+cron), como en proveedores/requisitos. El salto **aspecto significativo → objetivo o NC** con un clic queda **diferido** (se evalúa en uso).

## Consecuencias
- Conecta el aspecto con su obligación legal y con el filtro por norma del Tablero sin duplicar datos.
- La matriz "se mantiene viva" sin seguimiento manual.
- Los enlaces a objetivos/NC se añaden luego con su propia auditoría, como en los módulos previos.
