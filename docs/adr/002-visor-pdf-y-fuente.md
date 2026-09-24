# ADR-002 — Visualización: PDF de consulta + archivo fuente descargable

**Contexto.** Hay que visualizar Word/Excel en la ficha. Alternativas: conversión a PDF en servidor (LibreOffice/Gotenberg, infraestructura con costo), visor de Microsoft Office Online (exige URL pública: el documento sale del perímetro) o PDF subido por el elaborador.

**Decisión.** Cada versión lleva el **PDF** (obligatorio, se visualiza en el navegador) y el **editable** (docx/xlsx, se descarga con permiso). Ambos con hash SHA-256.

**Consecuencias.** Sin costo ni terceros. Carga algo mayor para el elaborador (exportar a PDF). El revisor valida la coherencia PDF↔fuente. La comparación entre versiones queda en la hoja de ruta.
