# Design Spec — Competencias: matriz, catálogo y formación (`/app/competencias`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/competencias/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver de un vistazo quién **cumple** y quién tiene **brecha** de competencia, y entrar a la persona o al perfil del cargo para actuar.
- **Protagonista:** la **matriz persona × competencia** con su estado por celda.
- **Acciones según rol:** gestionar (catálogo, perfiles, formación, evaluaciones) = Líder SIG; Líder de proceso = lo de **su** proceso; ver = roles del SIG; cada persona ve **su** ficha. La matriz completa la ven los roles del SIG; el Líder de proceso la ve acotada a su proceso.

## 2. Wireframe textual (escritorio)

```
Competencias (h1)                               [ Catálogo ]  [ Formación ]
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Cobertura    │ │ Brechas      │ │ Certificados     │   (3 tarjetas resumen)
│   82%        │ │ abiertas  5  │ │ por vencer    2  │
└──────────────┘ └──────────────┘ └──────────────────┘
[ Proceso ▾ ] [ Cargo ▾ ] [ Estado ▾ ]  [ Buscar persona… ]      (filtros)

Proceso: Gestión de Calidad (SGC)
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Persona / Cargo │ Auditoría│ Redacción│ ISO 9001 │ Excel    │  ← competencias (col.)
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Ana Ruiz        │ ✓ N3     │ ✓ N2     │ ▲ 2/3    │ — s/eval │  ← celda: estado + nivel
│ Líder SIG       │          │          │ en plan  │          │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Beto Páez       │ ✓ N2     │ ✗ 1/3    │ ✓ N2     │ ✓ N1     │
│ Auditor interno │          │ brecha   │          │          │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
(fila = persona de un cargo; columna = competencia del perfil del cargo; clic en fila → ficha de persona)
```

- La matriz se **agrupa por proceso** (encabezado de grupo) y, dentro, una fila por persona (membership activa). Las **columnas** son las competencias que exige el perfil del/los cargos del grupo; si una competencia no aplica al cargo de esa persona, la celda va vacía con guion tenue.
- **Celda** = `CompetencyStatusCell`: ícono/estado + nivel `evaluado/requerido` (p. ej. "2/3"). Estados: cumple (✓, éxito), brecha (✗, error), brecha_en_plan (▲, advertencia), sin evaluar (—, neutro). El estado nunca por color solo: lleva glifo y, en la celda, el texto de nivel.

## 3. Secciones

- **Encabezado:** título (h1) + accesos **"Catálogo"** y **"Formación"** (botones `outline`; visibles a quien gestiona).
- **Resumen** (3 `StatCard`): **% de cobertura** (competencias obligatorias cumplidas / requeridas, sobre el alcance visible), **brechas abiertas** (brecha + brecha_en_plan), **certificados por vencer** (≤ 60 días o vencidos). En móvil se apilan.
- **Filtros** (lado cliente): **Proceso**, **Cargo**, **Estado** (todas/cumple/brecha/brecha_en_plan/sin evaluar) y **Buscar persona**. "Limpiar filtros" cuando hay alguno.
- **Matriz** (agrupada por proceso). Orden: proceso → persona (alfabético). Fila clicable → `/app/competencias/personas/[membershipId]`. El encabezado de columna muestra el nombre de la competencia y, al pasar el cursor/tap, su `kind` (chip).

## 4. Catálogo y Formación (subrutas)

- **`/app/competencias/catalogo`** — tabla de competencias (`DataTable`): nombre, `kind` (chip), nº de cargos que la exigen, activa. Sheet **"Nueva competencia"**: nombre (req), descripción (opc), **tipo** (Select: educación/formación/habilidad/experiencia). Editar/archivar (no borrar si está en uso → mensaje). Gestión: Líder SIG.
- **`/app/competencias/formacion`** — lista de formaciones por fecha (card/fila): título, tipo (interna/externa) chip, proveedor, fecha, horas, nº de asistentes. Sheet **"Nueva formación"**: título (req), **tipo** (Select interna/externa), proveedor (opc), **fecha** (date, req), **horas** (number, opc), **asistentes** (multi-select de personas activas, agrupadas por cargo). Al guardar crea la formación y sus `training_attendees`. El certificado y el `valid_until` por persona se gestionan desde la ficha de la persona (o aquí por fila de asistente en v1.1). Gestión: Líder SIG.

## 5. Perfil del cargo (subruta)

- **`/app/competencias/cargos/[id]`** — encabezado (cargo, proceso). Lista de **requisitos**: competencia + **nivel requerido** (`LevelChip` 1/2/3) + **obligatoria** (badge). Sheet **"Agregar requisito"**: Select de competencia (del catálogo), Select de nivel (1 básico/2 intermedio/3 avanzado), switch obligatoria, nota (opc). Quitar requisito con confirmación. Gestión: Líder SIG. Estado vacío: "Este cargo aún no tiene perfil de competencias" + "Agregar requisito".

## 6. Comportamiento móvil (≤640px)

- Resumen: 3 tarjetas apiladas.
- **La matriz NO es una tabla ancha en móvil**: se vuelve **lista por persona** (una card por persona del grupo de proceso): nombre + cargo arriba; debajo, chips por competencia = `estado + nivel` (p. ej. "ISO 9001 ▲ 2/3"). Card clicable → ficha. Filtros apilados; "Buscar persona" a ancho completo.
- Catálogo/Formación: filas a ancho completo; Sheets a pantalla completa.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 3 tarjetas + 5 filas de matriz. Sin layout shift. |
| Vacío (sin competencias en el catálogo) | `EmptyState`: ícono (insignia/medalla), "Aún no defines competencias", "Crea el catálogo y asígnalo a los cargos" + "Nueva competencia" (si gestiona). |
| Vacío (hay catálogo, ningún cargo con perfil) | `EmptyState`: "Ningún cargo tiene perfil de competencias" + "Ir a un cargo". |
| Vacío por filtro | "Nadie coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al crear/evaluar; `router.refresh()`. |

## 8. Accesibilidad

- Contraste AA; estado de competencia **nunca por color solo** (glifo ✓/✗/▲/— + texto de nivel + `aria-label` "cumple/brecha/en plan/sin evaluar").
- La matriz es una `<table>` real con encabezados (`<th scope>`); en móvil, lista de cards con enlaces navegables por teclado.
- Todos los campos con `label`; foco visible.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, DataTable | Reutilizados | |
| CompetencyStatusCell / CompetencyStatusBadge | Nuevo | cumple→éxito, brecha→error, brecha_en_plan→advertencia, sin_evaluar→neutro; glifo + nivel evaluado/requerido |
| LevelChip | Nuevo | 1 Básico / 2 Intermedio / 3 Avanzado (tono neutro) |
| CompetencyKindChip | Nuevo | educación/formación/habilidad/experiencia |
| CompetencyMatrix | Nuevo | tabla agrupada por proceso (escritorio) ↔ lista por persona (móvil) |
| CatalogTable + NewCompetencySheet | Nuevo | catálogo |
| TrainingList + NewTrainingSheet | Nuevo | registro de formación con asistentes |
| PositionProfile + AddRequirementSheet | Nuevo | perfil del cargo |

## 10. Decisiones y porqués

- **La matriz es la portada** porque es el entregable que pide el auditor y el que los competidores resuelven en Excel; el resto (catálogo, formación, perfil) son soportes accesibles desde arriba.
- **% cobertura solo sobre competencias obligatorias**: una competencia opcional sin evaluar no debe bajar el indicador ni inflar las "brechas".
- **Móvil = lista por persona**, no scroll horizontal de tabla: la matriz ancha no cabe; se prioriza leer el estado por persona.
- **Nivel `evaluado/requerido` en la celda** (p. ej. 2/3) para que la brecha sea legible sin abrir la ficha.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
