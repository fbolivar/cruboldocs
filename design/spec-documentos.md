# Design Spec — Documentos / Lista maestra (`/app/documentos`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** encontrar la versión vigente de cualquier documento y saber su estado (reemplaza el Excel de lista maestra).
- **Protagonista:** la **tabla de la lista maestra**.
- **Acción primaria:** "Registrar documento" (solo Elaborador / Líder). Para el resto: buscar y abrir.

## 2. Wireframe textual (escritorio)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Documentos (h1)                       [Exportar CSV] [+ Registrar documento] │
│                                                                      │
│ Mapa de procesos  (colapsable, abierto por defecto)                  │
│ ESTRATÉGICOS  [Dirección 12] [Gestión SIG 18]                        │
│ MISIONALES    [Comercial 9] [Operaciones 24] [Compras 7]             │
│ APOYO         [Talento humano 11] [TI 8] [Financiera 6]              │
│ EVALUACIÓN    [Auditoría 5] [Mejora 4]                               │
│                                                                      │
│ [🔍 Código o título] [Proceso ▾] [Tipo ▾] [Estado ▾] [☐ Revisión vencida] Limpiar │
│ ┌──────────┬───────────────────────────┬──────────┬────┬───────────┬─────────────┬───┐
│ │Código ↕  │Título ↕                   │Proceso   │Ver.│Estado     │Próx. revisión↕│   │
│ ├──────────┼───────────────────────────┼──────────┼────┼───────────┼─────────────┼───┤
│ │PR-GC-003 │Control de documentos      │Gestión SIG│v4 │● En aprob.│15/03/2027   │ ⋯ │
│ │MA-SIG-001│Manual del SIG             │Gestión SIG│v7 │● Vigente  │⚠ 02/09/2026 │ ⋯ │
│ └──────────┴───────────────────────────┴──────────┴────┴───────────┴─────────────┴───┘
│ 1–25 de 104                                            ‹ 1 2 3 4 5 › │
└──────────────────────────────────────────────────────────────────────┘
```

- **Encabezado:** h1 + acciones. "Exportar CSV" (botón secundario, exporta **lo filtrado**) y "Registrar documento" (primario, solo si el rol lo permite).
- **Mapa de procesos** (card, estático, sin drag & drop): una fila por tipo de proceso con rótulo `caption`; cada proceso es un chip (`superficie`, borde, `radio-sm`) con nombre + conteo de documentos. Clic = filtra la tabla por ese proceso (chip activo: `acento-suave` + borde `acento`). Preferencia de colapsado recordada.
- **Filtros** (una fila, encima de la tabla): búsqueda por código o título (debounce 300 ms), Proceso, Tipo, Estado (multi), casilla "Revisión vencida". Filtros reflejados en la URL (compartibles). "Limpiar" aparece solo con filtros activos.
- **Tabla** (full-width, `superficie`, cabecera `superficie-alt` `label`): 6 columnas — Código (`mono`), Título, Proceso, Versión, Estado (badge según tokens), Próxima revisión (fecha; si está vencida: ícono ⚠ + texto `error-texto`). Orden por Código, Título y Próxima revisión (por defecto: Código asc). Paginación 25. **Clic en la fila → `/app/documentos/[id]`**. Menú "⋯": Abrir, Copiar enlace, Solicitar actualización (si vigente). Sin acciones destructivas aquí.
- **Panel "Registrar documento"** (drawer derecho 480px, `sombra-lg`): formulario en una columna, 3 secciones:
  1. *Identificación*: Proceso, Tipo, Título, Código (sugerido `TIPO-PROC-NNN`, editable, validado único).
  2. *Responsables*: Cargo elaborador (el suyo, por defecto), Cargo revisor, Cargo aprobador (validación de segregación: "El revisor y el aprobador deben ser cargos distintos al elaborador"), Cargos de distribución (multi), "Requiere confirmar lectura" (switch, activo).
  3. *Archivos y revisión*: PDF (obligatorio) + archivo fuente (Word/Excel, obligatorio), zona de arrastre con límite 25 MB visible; Revisar cada (meses, por defecto 12); Resumen del cambio.
  Botones: "Guardar borrador" (secundario) y "Enviar a revisión" (primario). Carga de archivos con barra de progreso por archivo.

## 3. Comportamiento móvil (≤640px)

- Acciones del encabezado: "Registrar" como botón flotante (`radio-md`, esquina inferior derecha, encima de la barra inferior); "Exportar" en menú "⋯".
- Mapa de procesos colapsado por defecto; al abrirse, chips en scroll horizontal por tipo.
- Filtros en botón "Filtros (n)" que abre hoja inferior; la búsqueda queda visible.
- Tabla → **lista de cards**: código `mono` + badge de estado arriba, título, línea "Proceso · v4 · Revisión 15/03/2027".
- Drawer de registro → pantalla completa.

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del mapa (chips) + 8 filas de tabla. |
| Vacío (sin documentos en la org) | Ícono de documento en hexágono + "Aún no hay documentos registrados." + "Registrar documento" (si tiene rol) o "Cuando se aprueben documentos, aparecerán aquí." |
| Vacío (filtros sin resultado) | "Ningún documento coincide con estos filtros." + "Limpiar filtros". |
| Error | Tabla: "No pudimos cargar la lista maestra." + "Reintentar". Carga de archivo: "El archivo supera 25 MB. Comprime el PDF o divide el documento." / "Solo se aceptan PDF para la versión de consulta." |
| Éxito | Registrar: cierra el drawer, toast "Documento PR-GC-015 enviado a revisión" y abre la ficha. Exportar: descarga `lista-maestra-AAAA-MM-DD.csv` + toast. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| ProcessMap / ProcessChip | Nuevo | Estático, agrupado por tipo |
| DataTable | Nuevo (Table de shadcn) | Reutilizado en riesgos y admin |
| FilterBar | Nuevo | Sincronizada con la URL |
| StatusBadge | Nuevo | Mapa de estados de tokens.md |
| Sheet (drawer) | shadcn | Registro |
| FileDropzone | Nuevo | Tipo, tamaño, progreso |
| PositionSelect | Nuevo (Combobox) | Selección de cargos |

## 6. Decisiones y porqués

- Mapa como filtro, no como página aparte: el mapa de procesos da contexto sin agregar una pantalla.
- Registro en drawer: el usuario no pierde la lista y el formulario cabe en 3 secciones.
- Sin columna de elaborador/aprobador en la tabla: están en la ficha; 6 columnas es el máximo.
- Admin (solo metadatos) ve la misma tabla; la restricción se nota en la ficha.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
