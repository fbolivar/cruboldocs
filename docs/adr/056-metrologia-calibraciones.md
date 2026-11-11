# ADR-056 — Metrología (7.1.5): equipos con historial de calibraciones y próxima fecha en servidor

## Contexto
ISO 9001 (7.1.5) exige equipos de seguimiento y medición **calibrados o verificados** a intervalos
definidos, con trazabilidad a patrones y estado conocido. Se necesita registrar el equipo y su historial
de calibraciones, y saber cuándo vence la próxima.

## Decisión
`measurement_equipment` guarda el equipo (código MET-AAAA-###, rango, unidad, ubicación, frecuencia de
calibración, responsable, estado, baja lógica) y `calibration_events` el **historial** (fecha, tipo,
resultado conforme/no_conforme/ajustado, patrón usado, **referencia de certificado en texto**, proveedor,
próxima fecha, nota). Al registrar una calibración, un RPC `SECURITY DEFINER` deriva la **próxima fecha**
(`date + frecuencia`) y actualiza `last_calibration_date`/`status` del equipo en el servidor (espejo de
controles/proveedores). RLS solo-SELECT + escritura por RPC con autorización por rol (Líder SIG o Líder
del proceso). Recordatorio por el cron (`calibrar_equipo`). **Adjuntos de certificados diferidos** (solo
referencia de texto), coherente con los módulos previos.

## Consecuencias
- Trazabilidad de calibraciones defendible ante auditoría; estado y próxima fecha reproducibles
  (server-side).
- Sin almacenamiento de archivos en v1; si se requiere el PDF del certificado, se añade luego un bucket.
- Reusa el patrón de próxima-fecha de controles/proveedores (ya APTO). Ver [ADR-057].
