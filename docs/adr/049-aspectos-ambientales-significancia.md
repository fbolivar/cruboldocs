# ADR-049 — Aspectos ambientales: significancia calculada en el servidor

## Contexto
14001 (6.1.2) exige determinar los aspectos ambientales **significativos** con un método trazable. Las matrices varían por organización, pero el auditor espera un criterio claro y reproducible, no una bandera a dedo.

## Decisión
`env_aspects` guarda la actividad, aspecto, impacto y condición (normal/anormal/emergencia) y **4 criterios** (Frecuencia, Severidad, Alcance, Cumplimiento legal) en escala 1–3. El servidor calcula el **índice** (suma, 4–12) y deriva la **significancia**: *significativo* si índice ≥ 8, o la condición es *emergencia*, o el aspecto tiene un requisito legal asociado. El valor se calcula en el RPC (no se confía del cliente). Numeración `ASP-AAAA-###`; baja lógica `inactivo` (sin DELETE).

## Consecuencias
- Método defendible y reproducible ante auditoría, coherente con GTC-45/Indicadores (cálculo server-side).
- Umbral y criterios fijos en v1; ajustarlos es un cambio acotado.
- Un cliente que exija su propia matriz de criterios usará el Constructor de formularios (#5), no este módulo.
