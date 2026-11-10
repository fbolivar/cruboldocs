# ADR-029 — Satisfacción del cliente: registro periódico simple (no motor de encuestas)

## Contexto
9.1.2 exige seguimiento de la **percepción del cliente**. Opciones: (a) un registro periódico de
satisfacción (periodo, método, puntaje), (b) una encuesta por cada PQRS al cerrar, (c) un motor de
encuestas completo (formularios, envíos, portal del cliente). (c) es otro producto; (b) ata la métrica
al volumen de quejas y no refleja la satisfacción general.

## Decisión
`satisfaction_measurements`: una medición por **periodo** y **método** (`encuesta`/`nps`/`csat`/`otro`),
con `score` **normalizado 0–100 validado en el servidor**, `responses` y nota. Es **independiente** de las
PQRS (la satisfacción general no es el promedio de las quejas). Alimenta la entrada de texto "satisfacción
del cliente" de la Revisión por la dirección; la lectura automática por el snapshot y un indicador formal
quedan diferidos.

## Consecuencias
- Simple y suficiente para 9.1.2; sin superficie de un motor de encuestas.
- La `conformidad del cliente` por PQRS (`satisfied`) se guarda a nivel de caso, pero la **métrica** de
  satisfacción vive en su propia tabla agregada (no es dato personal).
- Si luego se quiere NPS/CSAT con cálculo propio, se normaliza igual a 0–100 en el servidor.
