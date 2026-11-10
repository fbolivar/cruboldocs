# ADR-027 — Integraciones y certificados diferidos (proveedor→NC, indicador, Storage)

## Contexto
Un proveedor que incumple podría **generar una No Conformidad** con un clic (como hallazgo→NC / medición→NC),
alimentar un **indicador** "% de proveedores aprobados", y conservar **certificados/documentos** (ISO, pólizas)
en Storage. Cada integración añade superficie y auditoría; el precedente de Competencias fue diferir lo accesorio.

## Decisión
En el MVP se **difieren**: (a) proveedor→NC (se añadirá reutilizando `report_nonconformity` con un `source`
nuevo `'proveedor'`, idempotente con `for update`), (b) el indicador de cobertura, y (c) el **adjunto de
certificados en Storage**. Si se dejan columnas para archivos, quedan **nullables y sin ruta de escritura**
(inertes), como en Competencias. Cada diferido se implementará con su **propia auditoría** (el de Storage con
el patrón endurecido server-only: bucket privado + lectura por RLS + registro con actor explícito).

## Consecuencias
- Mantiene corta la auditoría del módulo y entrega el núcleo de 8.4 (selección/evaluación/reevaluación).
- El valor derivable (% aprobados) se puede leer del tablero aunque no exista aún el indicador formal.
- Quedan anotados en el ROADMAP para no perderlos.
