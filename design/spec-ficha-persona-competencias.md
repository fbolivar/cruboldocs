# Design Spec — Ficha de competencias de la persona (`/app/competencias/personas/[membershipId]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/competencias/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver el estado de competencia de **una persona** frente al perfil de su cargo (qué cumple, qué le falta), su formación con evidencia, y actuar sobre las brechas.
- **Protagonista:** la **tabla de competencias requerido vs. evaluado** con su estado/brecha.
- **Acciones según rol:** evaluar y registrar formación = Líder SIG o Líder del proceso del cargo; **la propia persona** ve su ficha en **solo lectura**; otros roles del SIG, solo lectura.

## 2. Wireframe textual (escritorio)

```
‹ Competencias
Ana Ruiz                                              [ Evaluar competencia ]
Líder SIG · Proceso Gestión de Calidad (SGC)

COMPETENCIAS (perfil del cargo)
┌───────────────┬───────┬──────────┬─────────────┬───────────────┐
│ Competencia   │ Req.  │ Evaluado │ Estado      │ Próx. revisión│
├───────────────┼───────┼──────────┼─────────────┼───────────────┤
│ Auditoría ISO │ N3    │ N3       │ ✓ Cumple    │ 2027-06-01    │
│ ISO 9001      │ N3    │ N2       │ ▲ En plan   │ —             │  → [tarea de cierre]
│ Excel         │ N1    │ —        │ — Sin eval. │ —             │
└───────────────┴───────┴──────────┴─────────────┴───────────────┘

FORMACIÓN                                            [ Registrar formación ]
┌────────────────────────────────────────────────────────────────┐
│ Diplomado Auditor Interno ISO 19011 · externa · 40 h · 2025-03  │
│ Aprobado · Certificado.pdf ⤓ · vence 2027-03-01                  │
├────────────────────────────────────────────────────────────────┤
│ Taller interno de redacción · interna · 4 h · 2026-02           │
│ Asistió · (sin certificado)                                      │
└────────────────────────────────────────────────────────────────┘

TRAZABILIDAD
• 2026-02-10  Ana Ruiz evaluó "ISO 9001": brecha en plan …
```

## 3. Secciones

- **Encabezado:** enlace "‹ Competencias"; nombre de la persona (h1), cargo y proceso (`texto-sec`); botón **"Evaluar competencia"** (si gestiona).
- **Competencias:** tabla con una fila por competencia **del perfil del cargo** de la persona: **Req.** (`LevelChip`), **Evaluado** (`LevelChip` o "—"), **Estado** (`CompetencyStatusBadge`: Cumple/En plan/Brecha/Sin evaluar), **Próxima revisión** (fecha o "—"). En una fila con **brecha**/**en plan**, acción contextual **"Crear tarea de cierre"** (si no existe aún) o enlace a la tarea.
- **Formación:** lista de `training_attendees` de la persona: título + tipo (chip) + horas + fecha; segunda línea: resultado (Aprobado/No aprobado/Asistió), **certificado** (descargar ⤓ si existe; adjuntar si gestiona, patrón de evidencia de control/NC), **vence** (con realce `advertencia` si ≤ 60 días o vencido). Botón **"Registrar formación"**.
- **Trazabilidad:** `NcTimeline` con los eventos del módulo para esta persona (evaluaciones, formación, tareas de cierre).

## 4. Sheet "Evaluar competencia" (gestiona)

Campos:
- **Competencia** (Select; por defecto las del perfil del cargo sin evaluar primero).
- **Nivel evaluado** (Select 0 ninguno / 1 básico / 2 intermedio / 3 avanzado). El **estado se deriva** (evaluado ≥ requerido → Cumple; si no → Brecha) y se muestra en vivo.
- **Próxima revisión** (date, opc).
- **Nota** (textarea, opc; obligatoria si queda **brecha**, para explicar el plan → estado "brecha_en_plan").
- Si queda brecha: switch **"Crear tarea de cierre"** (asigna una tarea al cargo).

Footer **"Guardar evaluación"** (loading) → toast, cierra, `router.refresh()`.

## 5. Sheet "Registrar formación" (gestiona)

Reutiliza el alta de formación pero con **esta persona** como asistente: Select de formación existente **o** crear una nueva (título/tipo/proveedor/fecha/horas); **resultado** (aprobado/no_aprobado/asistió); **certificado** (adjuntar PDF/imagen por el patrón de evidencia: subida firmada → verificación de tipo/tamaño/SHA en servidor); **vence** (date, opc). Footer "Guardar".

## 6. Comportamiento móvil (≤640px)

- Encabezado apilado; acciones a ancho completo.
- **Competencias:** la tabla se vuelve lista de cards (competencia + chips Req./Eval. + badge de estado; la acción de cierre como botón al pie de la card).
- **Formación:** cards a ancho completo (título + chips arriba; resultado/certificado/vence al pie).
- Sheets a pantalla completa.

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + 3 filas de competencias + 2 de formación. |
| Vacío (cargo sin perfil) | En Competencias: `EmptyState` "El cargo de esta persona no tiene perfil de competencias" + enlace al perfil del cargo (si gestiona). |
| Vacío (sin formación) | En Formación: `EmptyState` "Sin formación registrada" + "Registrar formación" (si gestiona). |
| Vacío (sin evaluaciones) | Las filas del perfil muestran "— Sin evaluar"; no es error. |
| Solo lectura (la propia persona u otro rol SIG) | Sin botones de gestión; la ficha se ve completa. |
| Error | `SectionError` por sección + "Reintentar"; errores de formulario inline. |
| Éxito | Toast al evaluar/registrar; `router.refresh()`. |

## 8. Accesibilidad

- Estado **nunca por color solo** (glifo + texto + `aria-label`).
- Tabla con encabezados (`<th scope>`); descarga de certificado como enlace con nombre de archivo.
- Campos con `label`; la nota obligatoria en brecha se anuncia con `aria-describedby`.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Badge, Chip, Button, Select, Input, Textarea, EmptyState, SectionError, NcTimeline | Reutilizados | |
| CompetencyStatusBadge, LevelChip, CompetencyKindChip | Nuevo (compartidos con spec-competencias) | |
| PersonCompetencyTable | Nuevo | requerido vs. evaluado + acción de cierre |
| AssessCompetencySheet | Nuevo | estado derivado en vivo; nota obligatoria si brecha |
| PersonTrainingList + RegisterTrainingSheet | Nuevo | reutiliza el patrón de evidencia (subida firmada + verificación server-only) |
| EvidenceUpload/Download (de control/NC) | Reutilizado | certificados |

## 10. Decisiones y porqués

- **Estado derivado en vivo** en el Sheet: el usuario ve de inmediato si su nivel cierra o no la brecha, igual que el cumplimiento estimado de Indicadores.
- **Nota obligatoria solo si queda brecha**: fuerza a declarar el plan (estado "en plan") sin estorbar cuando cumple.
- **Certificado opcional**: hay formación interna sin certificado; no se bloquea el registro por falta de PDF, pero el vencimiento resalta cuando existe.
- **La propia persona ve su ficha** (transparencia 7.3), en solo lectura; evaluar/registrar sigue siendo del Líder SIG/Líder de proceso.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
