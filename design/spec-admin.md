# Design Spec — Administración (`/app/admin`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** dejar la organización configurada (procesos, cargos con roles, usuarios) y mantener los accesos al día.
- **Protagonista:** la **tabla de la pestaña activa** (por defecto: Usuarios).
- **Acción primaria:** la de la pestaña ("Invitar usuario", "Crear cargo", "Crear proceso", "Crear tipo").

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Administración (h1)                                                  │
│ [Usuarios] [Cargos y roles] [Procesos] [Tipos de documento] [Recertificación ●2] [Auditoría] [Organizaciones*] │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Nombre o correo] [Estado ▾] [☐ Externos]      [+ Invitar usuario] │ │
│ │ Nombre        │ Cargo              │ Tipo     │ Vigencia    │ Estado │⋯│ │
│ │ Laura Gómez   │ Coord. de Calidad  │ Interno  │ —           │● Activo│⋯│ │
│ │ Andrés Ruiz   │ Auditor externo    │ Externo  │ al 31/12/26 │● Activo│⋯│ │
│ │ m.diaz@…      │ Líder de compras   │ Interno  │ —           │● Invitado│⋯│ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```
\* *Organizaciones* solo para el Superadmin.

- **Pestañas** (URL `?tab=`), visibles según rol: Admin org y Líder SIG ven todas menos Organizaciones; el Auditor solo ve **Auditoría** (lectura). Badge en Recertificación con pendientes.
- **Usuarios:** tabla (Nombre + correo en `small`, Cargo, Tipo interno/externo, Vigencia, Estado: Activo `exito`, Invitado `advertencia`, Vencido/Revocado neutro). Acciones "⋯": Cambiar cargo, Editar vigencia, Reenviar invitación, **Revocar acceso** (destructivo, confirmación con el nombre). *Invitar usuario* (drawer): Correo, Cargo, Externo (switch → Vigencia hasta, obligatoria), Es administrador de la organización (switch, con ayuda "Solo metadatos; no ve el contenido de los documentos"). Botón "Enviar invitación".
- **Cargos y roles:** lista de cargos a la izquierda (320px) y detalle a la derecha: nombre, proceso, **roles asignados** como tabla (Rol, Alcance: todos los procesos / proceso X) con agregar/quitar, y "Personas en este cargo". Avisos de segregación no aplican aquí (se aplican por documento).
- **Procesos:** tabla (Código, Nombre, Tipo, Cargo líder, Nº documentos); crear/editar en drawer. No se elimina un proceso con documentos: acción deshabilitada con tooltip que explica por qué.
- **Tipos de documento:** tabla simple (Código, Nombre, Nº documentos).
- **Recertificación:** encabezado con periodo ("Cada 180 días · próxima: 15/10/2026"); lista de membresías a revisar con decisión por fila **Mantener** / **Revocar** y botón "Guardar decisiones (n)". Vencidas primero.
- **Auditoría:** filtros (fecha desde/hasta, usuario, acción, entidad) + tabla (Fecha-hora, Actor, Acción, Entidad, Detalle "Ver cambios" que abre el diff en un panel `mono`). Solo lectura. Exportar CSV.
- **Organizaciones (Superadmin):** tabla (Nombre, NIT, Estado, Usuarios, Creada) + "Crear organización" (Nombre, NIT con validación "El NIT debe tener 9 dígitos y su dígito de verificación", correo del Administrador inicial). El Superadmin no ve contenido de documentos.

## 3. Comportamiento móvil (≤640px)

- Pestañas en scroll horizontal con la activa centrada.
- Tablas → cards con 3 campos (Usuarios: nombre, cargo, estado). Acciones en "⋯".
- Cargos y roles: lista y detalle se vuelven navegación en dos pasos.
- Recertificación: una card por membresía con los dos botones grandes.
- Uso previsto principalmente en escritorio; en móvil se garantiza invitar, revocar y recertificar.

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de la tabla de la pestaña activa. |
| Vacío | Por pestaña, con acción: "Aún no has invitado usuarios." + "Invitar usuario"; "Crea los procesos de tu mapa." + "Crear proceso"; "No hay accesos por recertificar." (check en hexágono `exito-suave`). |
| Error | "No pudimos cargar esta sección." + "Reintentar" (solo la pestaña). Invitación duplicada: "Este correo ya pertenece a la organización." |
| Éxito | Toasts: "Invitación enviada a m.diaz@acme.co", "Acceso revocado", "Decisiones de recertificación guardadas (5)". |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Tabs | shadcn | Sincronizadas con la URL |
| DataTable, FilterBar, Sheet, EmptyState | Reutilizados | |
| InviteForm, PositionRolesEditor, RecertList, AuditLogTable, DiffViewer, OrgForm | Nuevos | |
| ConfirmDialog | Nuevo (AlertDialog de shadcn) | Acciones destructivas |

## 6. Decisiones y porqués

- Una pantalla con pestañas en vez de 7 rutas: el Admin configura en una sesión y el sidebar se mantiene en 4 ítems.
- Roles en el cargo, visibles al editar el cargo: refleja ADR-001 (las personas heredan del cargo).
- La ayuda "solo metadatos" en la invitación evita que el cliente espere que el Admin vea los documentos.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
