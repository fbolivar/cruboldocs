# Design Spec — Ficha del documento (`/app/documentos/[id]`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** consultar la versión correcta del documento y ejecutar la acción que le toca en el flujo (revisar, aprobar, confirmar lectura…).
- **Protagonista:** el **visor PDF** de la versión seleccionada.
- **Acción primaria:** la **acción contextual** según rol + estado (una sola a la vez), en la barra de acción del encabezado.

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Documentos / PR-GC-003                                                   │
│ PR-GC-003 (mono, texto-sec)  ● En aprobación   v4                        │
│ Control de documentos (h1)                                               │
│ ┌─ Barra de acción (acento-suave si hay tarea para mí) ─────────────────┐│
│ │ Tienes esta tarea: aprobar la versión 4 · vence 25/09/2026            ││
│ │                               [Rechazar]  [✍ Firmar aprobación]       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│ ┌───────────────────────────────────────────┬──────────────────────────┐ │
│ │ Visor PDF (protagonista, alto 75vh)        │ Detalles                 │ │
│ │ [‹ 3/12 ›] [− 100% +] [⤓ PDF] [⤓ Fuente]   │ Proceso: Gestión SIG     │ │
│ │                                            │ Tipo: Procedimiento      │ │
│ │                                            │ Elabora: Coord. Calidad  │ │
│ │                                            │ Revisa: Líder SIG        │ │
│ │                                            │ Aprueba: Gerente General │ │
│ │                                            │ Revisión cada 12 meses   │ │
│ │                                            │ Próxima: 15/03/2027      │ │
│ │                                            │ Hash PDF: 3fa9…c21 ⧉     │ │
│ └───────────────────────────────────────────┴──────────────────────────┘ │
│ [Comentarios (3)] [Versiones (4)] [Firmas] [Lecturas 18/24] [Solicitudes (1)] │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ contenido de la pestaña                                               │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Encabezado:** código `mono`, badge de estado, versión; h1 con el título. Si la versión mostrada no es la vigente, banner `advertencia-suave`: "Estás viendo la versión 3 (reemplazada). Ver versión vigente →".
- **Barra de acción** (solo cuando hay algo que hacer; `acento-suave` si es una tarea asignada, `superficie` con borde si es una acción disponible). Mapa rol × estado:

| Estado de la versión | Quién | Acciones (primaria en **negrita**) |
|---|---|---|
| Borrador | Elaborador | Reemplazar archivos · **Enviar a revisión** |
| En revisión | Revisor | Devolver con comentarios · **Firmar revisión** |
| En aprobación | Aprobador | Rechazar · **Firmar aprobación** |
| Vigente, lectura pendiente | Cargo de distribución | **Confirmar lectura** (habilitado tras abrir el visor) |
| Vigente | Cualquiera | **Solicitar actualización** (secundario) |
| Vigente, solicitud abierta | Líder/Elaborador | Rechazar solicitud · **Crear nueva versión** |

- **Modal de firma** (`radio-lg`, `sombra-lg`, 480px): título "Firmar aprobación de PR-GC-003 v4"; bloque de lo que se firma (documento, versión, hash del PDF en `mono`); texto del significado: "Apruebo este documento para su uso en la organización."; campo de contraseña (reautenticación, label "Confirma tu contraseña para firmar"); casilla "Entiendo que esta firma queda registrada con fecha, hora e IP." Botón primario "Firmar aprobación", secundario "Cancelar". Rechazar/Devolver: modal con motivo obligatorio (textarea).
- **Visor PDF** (card, `superficie`): barra superior con paginación, zoom, descarga del PDF y de la fuente. **Admin solo-metadatos:** el visor se reemplaza por un estado informativo con candado en hexágono: "Tu rol de administrador permite ver los datos del documento, pero no su contenido." y sin botones de descarga.
- **Detalles** (columna derecha 320px): lista de pares label/valor (`small` `texto-sec` / `body`), cargos responsables, periodicidad, hash con copiar.
- **Pestañas:**
  - *Comentarios*: hilo por versión; cada comentario con autor, fecha, texto (`body-lg`) y "Marcar resuelto"; comentarios resueltos atenuados. Caja de nuevo comentario solo para el revisor en estado En revisión y para el elaborador para responder.
  - *Versiones*: tabla (Versión, Estado, Resumen del cambio, Aprobada por, Fecha de vigencia); clic muestra esa versión en el visor.
  - *Firmas*: línea de tiempo (quién, cargo, acción, significado, fecha-hora, IP, hash de firma abreviado). Solo lectura.
  - *Lecturas*: barra de progreso "18 de 24 cargos confirmaron" (`exito`) + lista de pendientes y confirmados con fecha.
  - *Solicitudes de actualización*: lista con motivo, solicitante, estado y resolución.

## 3. Comportamiento móvil (≤640px)

- Orden: encabezado → barra de acción (botones full-width, primaria arriba) → visor (alto 60vh, con botón "Abrir en pantalla completa") → Detalles (acordeón cerrado) → pestañas en scroll horizontal.
- Modal de firma → hoja a pantalla completa.

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton de encabezado + rectángulo del visor + columna de detalles. El PDF muestra su propio indicador de carga dentro del visor. |
| Vacío | Pestañas vacías con mensaje de una línea: "Sin comentarios en esta versión.", "Aún no hay firmas.", "Este documento no requiere confirmar lectura.", "No hay solicitudes de actualización." |
| Error | Documento inexistente o sin permiso: página "No encontramos este documento o no tienes acceso." + "Volver a documentos". PDF no carga: dentro del visor, "No pudimos mostrar el PDF." + "Reintentar" + "Descargar PDF". Firma: contraseña incorrecta → error inline en el modal "La contraseña no es correcta. La firma no se registró."; segregación → "No puedes aprobar un documento que elaboraste o revisaste." |
| Éxito | Firma: modal se cierra, toast "Aprobación firmada. PR-GC-003 v4 está vigente.", badge y barra de acción se actualizan, nueva entrada en Firmas. Confirmar lectura: toast "Lectura confirmada" y la barra desaparece. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| DocumentHeader | Nuevo | Código, estado, versión, banner de versión no vigente |
| ActionBar | Nuevo | Mapa rol × estado |
| SignatureDialog | Nuevo (Dialog de shadcn) | Reautenticación |
| ReasonDialog | Nuevo | Rechazar / devolver / solicitar |
| PdfViewer | Nuevo | Visor nativo del navegador o pdf.js (decidir en frontend; dependencia a justificar) |
| MetaList | Nuevo | Pares label/valor |
| CommentThread, VersionTable, SignatureTimeline, ReadProgress, ChangeRequestList | Nuevos | |
| Tabs | shadcn | |

## 6. Decisiones y porqués

- Una sola acción primaria visible: evita firmar por error y deja claro "qué me toca".
- Confirmar lectura se habilita después de abrir el visor: da sentido al acuse de lectura.
- El hash se muestra en el modal: el usuario ve exactamente qué firma (ADR-004).
- Estado explícito para el Admin sin contenido: no parece un error, es una regla.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
