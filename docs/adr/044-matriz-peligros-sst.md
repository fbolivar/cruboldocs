# ADR-044 — Matriz de peligros SST (GTC-45) como módulo propio

## Contexto
45001 / Dec. 1072 exige una **matriz de identificación de peligros y valoración de riesgos** con la metodología **GTC-45** (Nivel de Deficiencia × Nivel de Exposición × Nivel de Consecuencia → Nivel de Riesgo, niveles I–IV). Es distinta de la matriz de riesgos de calidad ya existente.

## Decisión
Se modela un **módulo propio** `hazards` (no se mezcla con `risks` de calidad): peligro, proceso/área/cargo, clasificación GTC-45, controles existentes, valoración **calculada en el servidor** (ND/NE/NC → NR, nivel I–IV), medidas de intervención, responsable y estado. Comparte el patrón (RLS, RPC `SECURITY DEFINER`, tareas+cron, CSV) y se etiqueta con la norma 45001 vía `entity_norms`. Los **aspectos ambientales** (14001) se difieren a v1.1-4b.

## Consecuencias
- Cada metodología (calidad vs. SST) queda limpia; el auditor de SST ve su matriz GTC-45 tal cual la espera.
- El cálculo del Nivel de Riesgo es server-side (coherente con Indicadores/Proveedores), no confiado al cliente.
- Abre el mercado SG-SST sin ensuciar el módulo de riesgos de calidad.
