# Design Spec — Tablero de PQRS y satisfacción (`/app/pqrs`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pqrs/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver las PQRS del cliente con su **estado** y **vencimiento**, detectar las **vencidas**, registrar una nueva, y ver la **satisfacción** del periodo.
- **Protagonista:** la **lista de PQRS** con su badge de estado y su vencimiento.
- **Acciones según rol:** registrar/gestionar y registrar satisfacción = Líder SIG o Líder del proceso del caso (`can_manage_pqrs`); ver = roles del SIG (`can_see_pqrs`).

## 2. Wireframe textual (escritorio)

```
PQRS y satisfacción (h1)                           [ Exportar CSV ] [+ Nueva PQRS]
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Abiertas  7  │ │ Vencidas  2  │ │ Satisfacción (nov)    │   (3 tarjetas resumen)
│              │ │              │ │  84/100  ● Bien       │
└──────────────┘ └──────────────┘ └──────────────────────┘
[ Tipo ▾ ] [ Estado ▾ ] [ Vencimiento ▾ ] [ Proceso ▾ ]  [ Buscar… ]     (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ PQRS-2026-012  ◍ Reclamo     Juan Cliente        ■ En gestión          │
│ Correo · Comercial · Vence 2026-11-18 (en 3 días)                      │
├──────────────────────────────────────────────────────────────────────┤
│ PQRS-2026-011  Petición      María López         ■ Cerrada             │
│ Web · Servicio · Vencía 2026-11-02                                     │
└──────────────────────────────────────────────────────────────────────┘

SATISFACCIÓN DEL CLIENTE (9.1.2)                       [+ Registrar satisfacción]
┌───────────────────────────────────────────────┐
│ nov 2026 · Encuesta · 84/100 ● Bien · 32 resp. │
│ oct 2026 · NPS     · 71/100 ● Medio · 28 resp. │
└───────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + **"Exportar CSV"** y **"+ Nueva PQRS"** (este último solo si gestiona).
- **Resumen** (3 `StatCard`): **Abiertas** (estado recibida/en_gestion/resuelta), **Vencidas** (`due_date` < hoy y estado abierto), **Satisfacción del último periodo** (puntaje + semáforo). En móvil se apilan.
- **Filtros** (lado cliente): **Tipo** (todos/petición/queja/reclamo/sugerencia/felicitación), **Estado** (todos + los 5), **Vencimiento** (todas/vencidas/por vencer ≤7 días), **Proceso**, **Buscar** (código o cliente). "Limpiar filtros".
- **Lista** (cards/filas): **código** (`mono`), **chip de tipo** (reclamo resaltado), **cliente** (protagonista), **badge de estado**; segunda línea `texto-sec`: canal · proceso · "Vence `fecha`" (realce `advertencia` si vencida o ≤7 días; `texto-sec` si ya cerrada). Orden: vencidas/por vencer primero, luego por recepción reciente. Fila clicable → ficha.
- **Panel de satisfacción:** lista de las últimas mediciones (periodo · método · puntaje + semáforo · nº respuestas) + **"Registrar satisfacción"** (si gestiona). Vacío: "Aún no registras la satisfacción del cliente".

## 4. Sheet "Nueva PQRS" (gestiona)

Campos (labels, validación inline):
- **Tipo** (Select: petición/queja/reclamo/sugerencia/felicitación, req).
- **Canal** (Select: correo/teléfono/web/presencial/otro, req).
- **Cliente — nombre** (text, opcional) y **contacto** (text, opcional) — *dato personal; pedir solo lo necesario para responder*.
- **Proceso** (Select de procesos, opcional).
- **Descripción** (textarea, req).
- **Fecha de recepción** (date, req, no futura). Nota: "El plazo se fija en **+15 días** y puedes ajustarlo en la ficha."

Footer: **"Registrar PQRS"** (loading). Al crear: toast "PQRS-2026-0XX registrada.", cierra, `router.refresh()`.

## 5. Sheet "Registrar satisfacción" (gestiona)

- **Periodo** (month/date, req), **Método** (Select encuesta/NPS/CSAT/otro), **Puntaje** (number 0–100, req) con **semáforo en vivo** (≥80 Bien / 60–79 Medio / <60 Bajo), **Nº de respuestas** (number, opc), **Nota** (textarea, opc). Footer "Guardar". Una medición por periodo+método (si existe, se actualiza).

## 6. Comportamiento móvil (≤640px)

- Resumen: 3 tarjetas apiladas. Filtros apilados a ancho completo; "Buscar" a ancho completo.
- Lista: cada PQRS es una card a ancho completo — código + chip de tipo + badge arriba, cliente debajo, metadatos (canal/proceso/vencimiento) al pie.
- Panel de satisfacción debajo de la lista; Sheets a pantalla completa.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas + 2 filas de satisfacción. Sin layout shift. |
| Vacío (sin PQRS) | `EmptyState`: ícono (buzón/mensaje), "Aún no hay PQRS", "Registra la primera con «Nueva PQRS»" + botón (si gestiona). |
| Vacío por filtro | "Ninguna PQRS coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. Los errores del panel de satisfacción degradan solo ese panel. |
| Éxito | Toast al registrar; `router.refresh()`. |

## 8. Accesibilidad

- Contraste AA; estado, tipo y semáforo **nunca por color solo**: badge/chip con texto ("En gestión", "Reclamo") y el semáforo con número + palabra ("84/100, Bien").
- Filtros y campos con `label`; foco visible; la fila clicable es un enlace (`<Link>`), navegable por teclado.
- Aviso de dato personal junto a los campos del cliente.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError | Reutilizados | |
| PqrsStatusBadge | Nuevo | recibida→info, en_gestion→advertencia, resuelta→acento/info, cerrada→exito, anulada→neutro |
| PqrsTypeChip | Nuevo | petición/queja/reclamo/sugerencia/felicitación; **reclamo** con tono de realce (error-suave) |
| ChannelChip | Nuevo | correo/teléfono/web/presencial/otro |
| SatisfactionGauge | Nuevo | puntaje 0–100 + semáforo por umbral (≥80 éxito / 60–79 advertencia / <60 error); alineado al `ScoreMeter` de proveedores |
| PqrsSummaryBar, PqrsBoard, NewPqrsSheet, SatisfactionPanel + RecordSatisfactionSheet | Nuevo | espejo de los tableros previos |

## 10. Decisiones y porqués

- **"Vencidas" como métrica protagonista del resumen:** el cumplimiento del plazo es lo que exige 8.2/9.1.2 y lo que más duele al cliente.
- **Reclamo resaltado** en el chip de tipo: es el que puede escalar a NC y el que más atención requiere.
- **Satisfacción en el mismo tablero** (panel), no en otra ruta: es una pantalla más sobria y deja ambas caras de 9.1.2 juntas.
- **Dato personal minimizado y señalizado** en el formulario (solo nombre + un contacto).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
