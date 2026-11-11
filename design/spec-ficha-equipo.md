# Design Spec — Ficha de equipo de medición (`/app/metrologia/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/metrologia-cambios/ARQUITECTURA.md + ADR-056.

## 1. Propósito y protagonista
- **Qué logra:** ver los datos del equipo y su **historial de calibraciones**, registrar una nueva calibración y ver la **próxima fecha**.
- **Protagonista:** el **historial de calibraciones** (la evidencia de 7.1.5).
- **Roles:** ver = roles del SIG; registrar calibración / editar / dar de baja = Líder SIG o Líder del proceso.

## 2. Wireframe (escritorio)
```
‹ Metrología
MET-2026-002  Balanza analítica      ■ Vencido      [ Registrar calibración ] [ Editar ] [ ⋯ ]
Proceso Laboratorio · Rango 0–200 g · Frecuencia anual · Próxima: 2026-10-01 (vencida)

CALIBRACIONES (3)                                                [ Exportar CSV ]
┌──────────────────────────────────────────────────────────────────────┐
│ 2025-10-01 · Calibración · ■ Conforme · Patrón: masa clase E2          │
│ Cert: LAB-2025-114 · Metrocal S.A. · Próxima: 2026-10-01               │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** "‹ Metrología"; código, nombre, **badge de estado**; acciones **"Registrar calibración"**, **"Editar"** (Sheet), menú **⋯** (dar de baja). Metadatos: proceso, rango/unidad, frecuencia, **próxima fecha** con realce si vencida, responsable.
- **Historial de calibraciones:** lista (fecha, **tipo** calibración/verificación, **resultado** conforme/no_conforme/ajustado con badge, patrón, **referencia de certificado**, proveedor, próxima fecha). **"Exportar CSV"**. Vacío: "Aún sin calibraciones; registra la primera".
- **Sheet "Registrar calibración":** fecha, tipo, resultado, patrón usado (texto), referencia de certificado (texto), proveedor (texto), nota. Al guardar, el servidor **deriva la próxima fecha** (fecha + frecuencia) y actualiza el estado del equipo.
- (Opcional) **Trazabilidad** `NcTimeline`.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + filas del historial. |
| Vacío (sin calibraciones) | `EmptyState` + "Registrar calibración" (si gestiona). |
| Baja (fuera de servicio) | Encabezado atenuado; sin acciones de calibración; historial visible. |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 5. Accesibilidad
- Resultado/estado nunca por color solo (badge con texto). "Registrar calibración" con `label`; fechas con texto "(vencida)".

## 6. Móvil (≤640px)
- Encabezado apilado; acciones a ancho completo; calibraciones como cards. Sheet a pantalla completa.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, DropdownMenu, NcTimeline | Reutilizados | |
| EquipmentStatusBadge | Reutilizado (del tablero) | |
| **CalibrationResultBadge** | Nuevo | conforme→exito, ajustado→advertencia, no_conforme→error |
| **CalibrationList** + **RegisterCalibrationSheet** | Nuevo | historial + alta de calibración |
| EquipmentHeaderActions, ExportCalibrationsCsvButton | Nuevo | editar/baja; CSV del historial |

## 8. Decisiones y porqués
- **Historial como protagonista:** 7.1.5 se audita por la evidencia de calibración a lo largo del tiempo.
- **Próxima fecha derivada al calibrar:** el usuario no la calcula; el servidor la fija por la frecuencia (ADR-056).
- **Certificado como referencia de texto:** el adjunto se difiere; la referencia ya da trazabilidad.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
