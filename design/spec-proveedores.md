# Design Spec — Tablero de Proveedores (`/app/proveedores`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/proveedores/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver los proveedores de su organización con su **estado vigente** y **criticidad**, detectar los que están **por reevaluar**, y registrar uno nuevo.
- **Protagonista:** la **lista de proveedores** con su badge de estado.
- **Acciones según rol:** registrar/gestionar = Líder SIG o Líder del proceso del proveedor (`can_manage_suppliers`); ver = roles del SIG (`can_see_suppliers`).

## 2. Wireframe textual (escritorio)

```
Proveedores (h1)                                   [ Exportar CSV ] [+ Nuevo proveedor]
┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Aprobados    │ │ Condicionados /  │ │ Por reevaluar    │   (3 tarjetas resumen)
│   12         │ │ rechazados   3   │ │   2              │
└──────────────┘ └──────────────────┘ └──────────────────┘
[ Estado ▾ ] [ Criticidad ▾ ] [ Proceso ▾ ]  [ Buscar… ]            (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ PRV-2026-004  Transportes del Valle S.A.S.           ■ Aprobado        │
│ Servicio · Crítico alto · Logística · Reevaluar 2027-03-01             │
├──────────────────────────────────────────────────────────────────────┤
│ PRV-2026-003  Insumos Andinos Ltda.                  ■ Condicionado    │
│ Bien · Crítico medio · Compras · Reevaluar 2026-11-20 (vencida)        │
└──────────────────────────────────────────────────────────────────────┘
(fila clicable → ficha)
```

## 3. Secciones

- **Encabezado:** título (h1) + **"Exportar CSV"** y **"+ Nuevo proveedor"** (este último solo si gestiona).
- **Resumen** (3 `StatCard`): **Aprobados**, **Condicionados/rechazados** (suma), **Por reevaluar** (`next_eval_date` vencida o dentro de 30 días, solo proveedores activos). En móvil se apilan.
- **Filtros** (lado cliente): **Estado** (todos/pendiente/aprobado/condicionado/rechazado/inactivo), **Criticidad** (todas/alta/media/baja), **Proceso**, **Buscar** (nombre o código). "Limpiar filtros" cuando hay alguno.
- **Lista** (cards/filas): por proveedor **código** (`mono`), **nombre** (protagonista), **badge de estado**; segunda línea `texto-sec`: tipo · criticidad (chip) · proceso · "Reevaluar `fecha`" (con realce `advertencia` si vencida/próxima). Orden: por reevaluar primero, luego alfabético. Fila clicable → ficha.

## 4. Sheet "Nuevo proveedor" (gestiona)

Campos (labels, validación inline):
- **Razón social** (text, req).
- **NIT / identificación** (text, opcional; formato libre).
- **Tipo** (Select: bien / servicio / ambos, req).
- **Categoría** (text, opcional; p. ej. "Transporte").
- **Criticidad** (Select: alta / media / baja, req).
- **Proceso** (Select de procesos, opcional).
- **Contacto**: nombre, correo, teléfono (opcionales).

Footer: **"Registrar proveedor"** (loading). Al crear: toast "Proveedor PRV-2026-00X registrado.", cierra, `router.refresh()`. **Nota al pie:** "El proveedor nace *Pendiente*; haz su evaluación inicial desde la ficha." (La evaluación inicial se hace en la ficha — decisión de diseño: mantiene el alta simple y un único formulario de evaluación reutilizable.)

## 5. Comportamiento móvil (≤640px)

- Resumen: 3 tarjetas apiladas.
- Filtros apilados a ancho completo; "Buscar" a ancho completo.
- Lista: cada proveedor es una card a ancho completo — código + badge arriba, nombre debajo, metadatos (tipo/criticidad/proceso/reevaluación) al pie.
- "Nuevo proveedor" → Sheet a pantalla completa.

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas. Sin layout shift. |
| Vacío (sin proveedores) | `EmptyState`: ícono (camión/caja), "Aún no hay proveedores", "Registra el primero con «Nuevo proveedor»" + botón (si gestiona). |
| Vacío por filtro | "Ningún proveedor coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al registrar; `router.refresh()`. |

## 7. Accesibilidad

- Contraste AA; el estado y la criticidad **nunca por color solo**: badge con texto ("Aprobado"…) y chip con texto ("Crítico alto").
- Filtros y campos con `label`; foco visible; la fila clicable es un enlace (`<Link>`), navegable por teclado.

## 8. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, EmptyState, SectionError | Reutilizados | |
| SupplierStatusBadge | Nuevo | aprobado→exito, condicionado→advertencia, rechazado→error, pendiente→info, inactivo→neutro (ver spec-ficha) |
| CriticalityChip | Nuevo | alta→tono error-suave ("Crítico alto"), media→neutro, baja→neutro |
| SupplierKindChip | Nuevo | bien / servicio / ambos |
| SupplierSummaryBar | Nuevo | 3 StatCard |
| SupplierBoard (lista + filtros cliente) | Nuevo | espejo de los tableros previos |
| NewSupplierSheet | Nuevo | alta |

## 9. Decisiones y porqués

- **Alta y evaluación separadas:** el proveedor nace *Pendiente* y la evaluación (inicial o periódica) usa **un solo** formulario en la ficha → menos superficie y un único cálculo de puntaje. El tablero deja claro el *Pendiente*.
- **"Por reevaluar" como métrica protagonista del resumen:** es la acción que 8.4.2 exige vigilar; combina vencidas y próximas (30 días).
- **Criticidad siempre visible:** orienta el esfuerzo de evaluación (un proveedor crítico alto pesa más que uno bajo).

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
