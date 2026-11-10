# ADR-034 — Alcance del módulo (L) y diferidos

## Contexto
"Actas + Planeación estratégica (BSC)" es un módulo grande (L). Intentar un producto completo de planeación
(mapa estratégico, cascada de objetivos, versionado de la política, calendario/convocatoria, firma de actas,
adjuntos) excede 6.2 mínimo y la superficie de auditoría razonable para cerrar la suite.

## Decisión
MVP en **3 vistas**: `/app/actas` (tablero + ficha con compromisos) y `/app/objetivos` (tablero por
perspectiva BSC con Sheets, sin ficha aparte). Se **difieren**: firma de actas; adjuntos en Storage;
compromiso/objetivo incumplido → NC con un clic (reutilizaría `report_nonconformity`); lectura de
objetivos/actas por el snapshot de la Revisión por la dirección; mapa estratégico gráfico, cascada de
objetivos y versionado de la política de calidad (la política se gestiona como documento controlado en el
Módulo 1). El agente IA (redactar/resumir actas) queda solo en el ROADMAP (dato personal → re-auditoría).

## Consecuencias
- Entrega el núcleo de 6.2 (objetivos medibles + actas con compromisos) sin inflar la superficie.
- Cada diferido se implementará con su propia auditoría, como en Competencias/Proveedores/PQRS.
- La suite ISO 9001 queda cubierta de punta a punta (módulos 1–8) con un alcance mantenible.
