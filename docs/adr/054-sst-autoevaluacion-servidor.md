# ADR-054 — SG-SST (Res. 0312): autoevaluación con puntaje y valoración calculados en servidor

## Contexto
La Resolución 0312 de 2019 obliga a autoevaluar el SG-SST contra los **Estándares Mínimos** y a
calificarlo con una **tabla de valores** oficial (art. 27) y una **valoración** por rangos (art. 28).
Los estándares aplicables y sus pesos **dependen del nivel** (7/21/60) según tamaño y clase de riesgo.
El resultado debe ser **trazable y reproducible** ante el Ministerio y la ARL.

## Decisión
El **catálogo de estándares** (`sst_standards`) es una **tabla nacional de referencia**, de solo
lectura para los clientes, **sembrada del Anexo oficial**, con la aplicabilidad y el **peso por nivel**
(`weight_7`/`weight_21`/`weight_60`). Cada organización registra una **autoevaluación** (`sst_evaluations`)
cuyo **nivel se deriva** del nº de trabajadores y la clase de riesgo, y marca cada estándar aplicable
como **Cumple / No cumple / No aplica** (con justificación). Un **RPC `SECURITY DEFINER`** calcula el
**puntaje** (suma de pesos obtenidos sobre los ítems aplicables al nivel) y la **valoración** (Crítico /
Moderadamente aceptable / Aceptable, umbrales textuales del art. 28); el cliente nunca lo calcula.
Multi-tenant por `organization_id` (RLS); numeración atómica `SGSST-AAAA-###`.

## Consecuencias
- Resultado defendible y reproducible, coherente con GTC-45 / significancia ambiental (cálculo server-side).
- La exactitud depende del **seed**: se prueba que cada nivel suma 100% y que el puntaje coincide con
  casos conocidos.
- Un cambio normativo se maneja versionando el catálogo, sin alterar autoevaluaciones ya cerradas.
- Ver [ADR-055] (alcance del MVP).
