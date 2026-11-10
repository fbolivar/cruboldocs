# ADR-013 — Una medición que no cumple genera una NC con un clic

## Contexto
ISO 9.1/10.2: cuando un indicador no alcanza su meta, la organización debe analizar y, si procede,
tratar la desviación por el ciclo de mejora. El Módulo 1 (No Conformidades) ya está en producción con
`report_nonconformity(source=…)`, donde `source` admite
`'auditoria_interna','auditoria_externa','queja_pqrs','producto_servicio','riesgo_materializado','mejora','otro'`.
Falta decidir cómo conectar una medición incumplida con una NC y con qué `source`.

## Decisión
La medición `no_cumple` **no** crea la NC automáticamente. Un gestor (Líder SIG o el Líder del proceso
dueño) la genera **con un clic** mediante `generate_nc_from_measurement(measurement)`, que reutiliza
`report_nonconformity` con el proceso del indicador y guarda el enlace en
`indicator_measurements.nonconformity_id`; verifica idempotencia (`nonconformity_id` vacío + `for update`).
Se **agrega `'indicador'` al `check` de `nonconformities.source`** (en vez de reusar `'mejora'`/`'otro'`)
para trazar el origen con precisión. La migración altera el constraint (patrón de `tasks_type_check`).

## Consecuencias
- Trazabilidad limpia: una NC de origen `indicador` se distingue y puede reportarse aparte.
- Reutiliza todo el ciclo CAPA ya auditado (numeración, tareas, verificación de eficacia).
- Alterar el enum obliga a actualizar las etiquetas de origen (`SOURCE_LABELS`) del Módulo 1 y su prueba
  de completitud; es un cambio contenido y cubierto por los tests.
