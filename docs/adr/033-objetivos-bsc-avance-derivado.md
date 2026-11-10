# ADR-033 — Objetivos de calidad por perspectiva BSC con avance derivado de indicadores

## Contexto
6.2 pide objetivos de calidad medibles y con seguimiento. El Módulo 3 ya mide **indicadores** con su
cumplimiento (cumple/en_riesgo/no_cumple). Capturar el avance del objetivo a mano duplicaría ese dato y se
desincronizaría; un motor de planeación estratégica (mapa, cascada) es otro producto.

## Decisión
`quality_objectives` clasifica cada objetivo en una **perspectiva BSC fija** (financiera/cliente/procesos/
aprendizaje), con meta en texto, proceso dueño y horizonte. Un objetivo liga **N indicadores** existentes
(`objective_indicators`, FK compuesta → misma organización). El **avance se deriva en el servidor** del
cumplimiento de la **última medición** de esos indicadores (p. ej. % de indicadores ligados que `cumple`);
si no hay indicadores ligados, el avance es "sin datos" (no se inventa). El **estado** (activo/cumplido/
no_cumplido/archivado) lo fija el Líder SIG manualmente al cierre del horizonte. Numeración `OBJ-AAAA-###`.

## Consecuencias
- Conecta 6.2 con el 9.1 ya construido: el objetivo "hereda" la medición real, sin captura doble.
- Las perspectivas fijas bastan para un BSC clásico; si se requieren otras, es una ampliación.
- El avance es una vista derivada (no persistida): se recalcula al leer, sobre datos acotados por RLS.
