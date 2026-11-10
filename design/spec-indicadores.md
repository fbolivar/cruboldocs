# Design Spec — Tablero de Indicadores (`/app/indicadores`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/indicadores/ARQUITECTURA.md

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** ver de un vistazo el desempeño de sus KPIs por proceso — cuántos cumplen, cuáles están en riesgo o no cumplen este periodo — y entrar a cualquiera para capturar o revisar su medición.
- **Protagonista:** la **lista de indicadores con su estado de cumplimiento y mini-tendencia** (la reportería clara es el diferenciador del módulo).
- **Acciones según rol:** crear indicador = Líder SIG (`can_manage_indicators`); ver = roles del SIG (`can_see_indicators`); capturar mediciones se hace desde la ficha.

## 2. Wireframe textual (escritorio)

```
Indicadores (h1)                                        [+ Nuevo indicador]
┌───────────┬───────────┬───────────┬───────────┐
│ Activos   │ Cumplen   │ En riesgo │ No cumplen│   (tarjetas resumen, periodo actual)
│   12      │   75%     │    2      │    1      │
└───────────┴───────────┴───────────┴───────────┘
[ Proceso ▾ ]  [ Estado ▾ ]  [ Frecuencia ▾ ]                (filtros)

┌──────────────────────────────────────────────────────────────────────┐
│ IND-2026-003  Cumplimiento de entregas a tiempo        ▂▄▆▇▆  ■ Cumple │
│ SVC · % · meta ≥ 95 · último 97 (nov-2026)                             │
├──────────────────────────────────────────────────────────────────────┤
│ IND-2026-001  Reprocesos en producción                 ▆▅▃▄▅  ▲ Riesgo │
│ DS · % · meta ≤ 3 · último 3.4 (nov-2026)                              │
├──────────────────────────────────────────────────────────────────────┤
│ IND-2026-005  Satisfacción del cliente                 ▅▄▃▂▁  ✖ No cumple│
│ COM · pts · meta ≥ 4.5 · último 3.9 (oct-2026)                         │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Secciones

- **Encabezado:** título (h1) + botón **"+ Nuevo indicador"** (solo Líder SIG). 
- **Tarjetas resumen** (4, `KpiCard` reutilizado): **Activos** (nº indicadores `activo`), **Cumplen** (% de los activos con medición del periodo actual en `cumple`), **En riesgo** (nº en `en_riesgo`), **No cumplen** (nº en `no_cumple`). El % toma solo indicadores con medición del periodo vigente; los sin medición no cuentan como cumplen ni no-cumplen (nota al pie: "N sin medición este periodo").
- **Filtros** (fila, lado cliente): **Proceso** (Select de procesos de la organización), **Estado de cumplimiento** (cumple/en riesgo/no cumple/sin medición), **Frecuencia** (mensual…anual). "Limpiar filtros" cuando hay alguno activo.
- **Lista de indicadores** (cards/filas): por indicador: **código** (`mono` pequeño), **nombre** (protagonista de la fila), **mini-tendencia** (sparkline SVG, §6), **badge de cumplimiento** del último periodo; segunda línea `texto-sec`: proceso (chip), unidad, meta (según sentido: "≥ 95", "≤ 3", "40–60"), último valor con su periodo. Fila clicable → ficha. Indicadores `archivado` ocultos por defecto (toggle "Ver archivados").

## 4. Sheet "Nuevo indicador" (Líder SIG)

Campos (con labels, validación inline):
- **Nombre** (text, req).
- **Proceso** (Select de procesos, req).
- **Descripción / fórmula** (textarea, opcional) — cómo se calcula.
- **Unidad** (text corto, req; p. ej. `%`, `días`, `pts`).
- **Sentido** (Select, req): "Mayor es mejor" / "Menor es mejor" / "Rango".
- **Meta** (number, req). Si sentido = **Rango**, aparece además **Meta máx** (number, req) y la Meta se rotula "Mín".
- **Tolerancia %** (number, opcional; placeholder "10") — margen para "en riesgo".
- **Frecuencia** (Select, req): mensual/bimestral/trimestral/semestral/anual.
- **Responsable** (Select de cargos, opcional) — recibirá la tarea de captura.
- **Indicador de tasa** (checkbox): si se marca, nota "Las mediciones se capturan como numerador/denominador".

Footer: **"Crear indicador"** (loading al enviar). Al crear: toast "Indicador IND-2026-00X creado.", cierra el Sheet y `router.refresh()`.

## 5. Comportamiento móvil (≤640px)

- Tarjetas resumen: grid 2×2.
- Filtros: se colapsan en un botón "Filtros" que abre un Sheet, o se apilan a ancho completo (igual que NC/Auditorías).
- Lista: cada indicador es una card a ancho completo — nombre + badge arriba, sparkline bajo el nombre, metadatos (proceso/unidad/meta/último) debajo.
- "Nuevo indicador" → Sheet a pantalla completa.

## 6. Componentes de presentación nuevos

- **ComplianceBadge** (badge de cumplimiento): `cumple`→tono **éxito** ("Cumple"), `en_riesgo`→**advertencia** ("En riesgo"), `no_cumple`→**error** ("No cumple"), `sin_medicion`→**neutro** ("Sin medición").
- **Sparkline** (SVG, §ADR-014): ~72×24 px, línea `acento` (1.5px), último punto coloreado por cumplimiento (éxito/advertencia/error), sin ejes. Si <2 mediciones, muestra guion `texto-sec` "—". `aria-label` con el resumen ("tendencia de 5 periodos, último 97").
- **Chips** de sentido y frecuencia (reutiliza `Chip`): "Mayor mejor"/"Menor mejor"/"Rango"; "Mensual"… (se usan más en la ficha; en la lista basta la meta formateada).

## 7. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: 4 tarjetas + 5 filas de lista (con bloque de sparkline). Sin layout shift. |
| Vacío (sin indicadores) | `EmptyState`: ícono (gráfica), "Aún no hay indicadores", "Define el primer KPI de un proceso" + botón "+ Nuevo indicador" (si Líder SIG). |
| Vacío por filtro | "Ningún indicador coincide con los filtros" + "Limpiar filtros". |
| Error | `SectionError` + "Reintentar"; errores del formulario inline. |
| Éxito | Toast al crear; `router.refresh()`. |

## 8. Accesibilidad

- Contraste AA; el estado **nunca** se comunica solo por color: el badge lleva texto ("Cumple"/"En riesgo"/"No cumple") y el sparkline tiene `aria-label`.
- Filtros y campos con `label`; foco visible; la fila clicable es un enlace (`<Link>`), navegable por teclado.

## 9. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, KpiCard, Badge, Chip, Button, Select, Input, Textarea, Checkbox, EmptyState, SectionError | Reutilizados | |
| ComplianceBadge | Nuevo | mapa estado→tono (§6) |
| Sparkline | Nuevo | SVG puro, sin librería (ADR-014) |
| IndicatorBoard (lista + filtros cliente) | Nuevo | espejo de AuditBoard |
| NewIndicatorSheet | Nuevo | formulario con campo condicional (rango → meta_max; tasa → nota) |

## 10. Decisiones y porqués

- **Resumen por cumplimiento del periodo vigente:** responde la pregunta de dirección "¿cómo vamos este mes/trimestre?" sin abrir cada ficha.
- **Sparkline en la lista:** la tendencia a un golpe de vista es justo lo que la competencia hace mal; barato con SVG.
- **Campos condicionales en el Sheet:** meta_max solo en rango, num/den solo si es tasa — evita formularios confusos.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
