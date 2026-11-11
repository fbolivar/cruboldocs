# Design Spec — Metrología: equipos de seguimiento y medición (`/app/metrologia`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/metrologia-cambios/ARQUITECTURA.md + ADR-056.

## 1. Propósito y protagonista
- **Qué logra:** ver los **equipos de medición** con su estado de calibración y su **próxima fecha**, y registrar nuevos equipos.
- **Protagonista:** la **lista de equipos** con su estado (vigente/vencido/fuera de servicio) y próxima calibración.
- **Roles:** ver = roles del SIG; registrar/gestionar = Líder SIG o Líder del proceso.

## 2. Wireframe (escritorio)
```
Metrología (h1)                                               [+ Nuevo equipo]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Equipos    12│ │ Vencidos   2 │ │ Por vencer (30 d)  3 │
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Estado ▾ ] [ Proceso ▾ ] [ Buscar… ]

┌──────────────────────────────────────────────────────────────────────┐
│ MET-2026-003  Calibrador de presión     Proceso Producción  ■ Vigente │
│ Rango 0–10 bar · Próxima: 2026-12-15                          [ Abrir ]│
├──────────────────────────────────────────────────────────────────────┤
│ MET-2026-002  Balanza analítica         Proceso Laboratorio  ■ Vencido │
│ Rango 0–200 g · Próxima: 2026-10-01 (vencida)                [ Abrir ]│
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones
- **Encabezado:** título + **"+ Nuevo equipo"** (si gestiona).
- **Resumen** (3 `StatCard`): equipos activos, **vencidos** (próxima fecha pasada), **por vencer** (≤30 días).
- **Filtros** (cliente): **Estado** (vigente/vencido/fuera_de_servicio), **Proceso**, **Buscar** (código/nombre).
- **Lista** (cards/filas): **código** (`mono`), **nombre** (protagonista), proceso, **badge de estado**; segunda línea `texto-sec`: rango · **Próxima: fecha** (realce si vencida). Fila clicable → ficha. Inactivos atenuados y ocultos por defecto (toggle).
- **Sheet "Nuevo equipo":** nombre, tipo, proceso (opc.), ubicación, rango, unidad, **frecuencia de calibración** (Select), responsable (opc.). Footer "Crear" → `MET-AAAA-###`.

## 4. Componentes nuevos
| Componente | Notas |
|---|---|
| **EquipmentStatusBadge** | vigente→exito, vencido→error, fuera_de_servicio→neutro. |
| MetrologySummaryBar, MetrologyBoard, NewEquipmentSheet | espejo de proveedores. |

## 5. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + filas. |
| Vacío | `EmptyState` (ícono regla/medidor): "Aún no registras equipos" + "Registrar el primero" (si gestiona). |
| Vacío por filtro | "Ningún equipo coincide" + "Limpiar filtros". |
| Error / Éxito | `SectionError` + reintentar; toast + `router.refresh()`. |

## 6. Accesibilidad
- Estado nunca por color solo (badge con texto). Fecha vencida con texto "(vencida)", no solo color. Filtros con `label`; fila `<Link>`.

## 7. Móvil (≤640px)
- Resumen apilado; equipos como cards; acción primaria a ancho completo. Sheet a pantalla completa.

## 8. Decisiones y porqués
- **Próxima fecha como eje:** es lo que el auditor revisa (equipos calibrados al día).
- **Estado derivado del servidor:** no se confía del cliente (ADR-056).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
