# ADR-036 — Exportación del tablero sin dependencias nuevas (CSV + PDF por impresión)

## Contexto
El tablero debe ser **evidencia exportable** (para la Revisión por la dirección y el auditor externo). Se pidieron PDF y Excel. La regla invariable del proyecto es «sin dependencias nuevas sin justificación de una línea». Opciones de PDF: cliente (impresión del navegador, o `jspdf`/`html2canvas`, o `@react-pdf`) o servidor (Puppeteer/Playwright render). Opciones de Excel: CSV (ya hay `toCsv`) o XLSX real (`exceljs`).

## Decisión
En el **MVP, cero dependencias nuevas**: **CSV** por panel con el `toCsv` existente (anti-inyección de fórmulas ya probado) y **PDF** mediante la **impresión del navegador** (`window.print()` + hoja de estilos `@media print` que oculta el shell y deja el tablero limpio). Se **difieren** el **XLSX real** (`exceljs`) y el **PDF server-side con plantilla corporativa**; cada uno, si se aprueba, entrará con su justificación de una línea y su propia revisión.

## Consecuencias
- Exportación útil desde el día uno sin ampliar `package.json` ni la superficie de seguridad.
- El PDF por impresión depende del navegador del usuario (resultado «suficiente», no pixel-perfect); aceptable para evidencia interna.
- Cuando un cliente exija XLSX con formato o un PDF de marca, se evalúa la dependencia puntual (preferible `exceljs` para XLSX; render server-side solo si hace falta fidelidad).
