# Design Spec — Integraciones (Importar CSV + Zapier/Make)

**Producto:** CrubolDocs · **Fecha:** 2026-11-13 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/integraciones/ARQUITECTURA.md (v1.6-4) + ADR-124/125/126.

## 1. Propósito y protagonista
- **Qué logra:** cargar registros en bloque desde un CSV (con previsualización) y conectar CrubolDocs a Zapier/Make con la API existente.
- **Protagonista:** la **tabla de previsualización** (informe por fila: qué se creará y qué falla), antes de escribir nada.
- **Marco:** nueva pestaña en Administración; reutiliza Card, Select, Button, Badge, Table, EmptyState, SectionError. La parte Zapier/Make es documentación + un endpoint de conexión (sin UI nueva salvo un bloque de ayuda).

## 2. Administración → pestaña "Importar"
- **Paso 1 — elegir entidad y plantilla:**
  - `Select` de entidad: **Procesos · Cargos · Proveedores · Requisitos legales**.
  - Debajo, las **columnas esperadas** de esa entidad y un botón **"Descargar plantilla CSV"** (cabecera + 1 fila de ejemplo).
  - Carga del archivo (`input file`, `.csv`), con límite visible (p. ej. máx. 1000 filas).
- **Paso 2 — previsualización (dry-run):** al subir, el servidor valida y devuelve una **tabla**: nº de fila, columnas clave, y **estado** (Badge: "Se creará" éxito / "Error" con el motivo: dato faltante, enum inválido, proceso no encontrado, duplicado). Arriba, un resumen: "18 se crearán · 2 con error". Si todas fallan → aviso y no se habilita Confirmar.
- **Paso 3 — confirmar:** botón **"Importar N válidas"** (deshabilitado si 0 válidas). Al confirmar, se crean solo las válidas reusando las reglas de la app; toast con el resultado ("18 creadas, 2 omitidas"); la tabla muestra el resultado final por fila.
- **Columnas por entidad (fijas):**
  - **Procesos:** `codigo` (2–6 A-Z/0-9), `nombre`, `tipo` (estrategico/misional/apoyo/evaluacion), `lider_cargo` (nombre de cargo, opcional).
  - **Cargos:** `nombre`, `proceso` (código o nombre, opcional).
  - **Proveedores:** `nombre`, `nit`, `tipo`, `categoria`, `criticidad`, `proceso`, `contacto_nombre`, `contacto_email`, `contacto_telefono`.
  - **Requisitos legales:** `titulo`, `tipo_fuente`, `referencia`, `emisor`, `descripcion`, `proceso`, `url`, `frecuencia`.

## 3. Bloque "Conectar con Zapier/Make"
- Un `Card` informativo dentro de la misma pestaña (o en la pestaña API existente): explica que se conecta con una **API key** y el **test de conexión** (`GET /api/v1/me`), enlaza a `docs/api/INTEGRACIONES.md`, y lista **triggers** (webhooks existentes) y **acciones** (POST existentes). Sin formularios nuevos.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Botón de previsualización/confirmación con spinner. |
| Vacío | Sin archivo → guía de columnas + plantilla. |
| Previsualización | Tabla con estado por fila + resumen. |
| Error de archivo | CSV ilegible / sin cabecera / demasiadas filas → mensaje humano + reintentar. |
| Éxito | Toast "N creadas, M omitidas"; tabla con resultado final. |
| Solo lectura | Si no es Admin/Líder SIG, la pestaña no aparece. |

## 5. Accesibilidad / Móvil
- Tabla de previsualización con scroll horizontal en móvil; estados con **texto** además del color (Badge con etiqueta). Labels en el selector y el file input. Plantilla descargable evita errores de formato.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Select, Button, Badge, Table, EmptyState, SectionError | Reutilizados | |
| **ImportPanel** (orquesta: entidad → carga → preview → confirmar) | Nuevo | pestaña Importar |
| **ImportPreviewTable** | Nuevo | informe por fila (estado + motivo) |
| **IntegrationsHelp** (bloque Zapier/Make) | Nuevo | ayuda + enlaces, sin formularios |

## 7. Decisiones
- **Dos pasos previsualizar→confirmar** (ADR-126): nada se escribe sin revisión.
- **Solo alta, columnas fijas, plantilla** (ADR-125): sin upsert ni mapeo arbitrario.
- **Zapier/Make = doc + `/api/v1/me`** (ADR-124): sin UI de formularios nueva.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
