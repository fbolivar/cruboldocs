---
name: disenador-ui
description: Genera la especificación visual (design spec) y el sistema de diseño de un producto SaaS ANTES de escribir código frontend. Usar siempre que el usuario inicie un producto o proyecto web nuevo, pida crear o rediseñar una pantalla, vista, dashboard, landing, formulario o componente, o mencione identidad visual, paleta, colores, tipografía, layout, UI o UX — incluso si solo dice "crea la pantalla X" o "hazme el dashboard" sin mencionar diseño. Si el producto pertenece a BC-Tech, aplica el preset Hex Core incluido. Nunca permitir que se escriba código de UI sin que exista primero un design-spec aprobado.
---

# Diseñador UI — Especificación visual antes del código

## Regla de oro

**Nunca se escribe código de UI sin design spec.** Esta skill produce dos artefactos versionados en el repo:

1. `design/tokens.md` — el sistema de diseño del producto (se crea UNA vez, se reutiliza siempre)
2. `design/spec-<pantalla>.md` — la especificación de cada pantalla o componente (una por vista)

El código frontend (skill `frontend-saas`) consume estos archivos como contrato. Si el usuario pide una pantalla y ya existen tokens, solo se genera la spec de esa pantalla. Si no existen tokens, primero se crean.

## Flujo de trabajo

```
¿Existe design/tokens.md en el proyecto?
├── NO → Paso 1: Definir identidad → Paso 2: Generar tokens → Paso 3: Spec de pantalla
└── SÍ → Paso 3: Spec de pantalla directamente
```

### Paso 1 — Definir identidad

Determinar a qué contexto pertenece el producto:

| Contexto | Acción |
|---|---|
| Producto de BC-Tech (o el usuario menciona BC-Tech, Hex Core, o la marca de la empresa) | Leer `references/preset-bctech.md` y usar ese preset como base |
| Cualquier otro producto o cliente | Leer `references/proceso-identidad.md` y seguir el proceso de derivación |

**En ambos casos**, antes de generar tokens, confirmar con el usuario en un solo mensaje: personalidad del producto (3 adjetivos), público objetivo, y modo claro/oscuro/ambos. Si el usuario ya dio esta información en la conversación, no volver a preguntar.

### Paso 2 — Generar `design/tokens.md`

Escribir el archivo con TODAS estas secciones (el formato exacto está en el preset o el proceso):

1. **Identidad**: nombre del producto, personalidad, público — 3 líneas máximo
2. **Paleta con roles**: cada color tiene un rol, nunca es decorativo (fondo, superficie, borde, texto primario/secundario, acento, acento-hover, éxito, advertencia, error, info)
3. **Tipografía**: máximo 2 familias (display + texto), escala definida (h1 a caption) con tamaño/peso/interlineado
4. **Espaciado**: escala en múltiplos de 4px (4, 8, 12, 16, 24, 32, 48, 64)
5. **Radios y sombras**: 3 niveles de cada uno, con uso asignado
6. **Salida técnica**: bloque de variables CSS y bloque de `tailwind.config` extendido con los tokens — esto es lo que el frontend importa

### Paso 3 — Spec de pantalla

Copiar la estructura de `assets/plantilla-design-spec.md` y completarla para la pantalla pedida. Antes de escribir la spec de un dashboard, tabla, formulario, onboarding o landing, leer `references/patrones-ux-saas.md` — contiene los patrones obligatorios por tipo de vista.

La spec es **texto, no código**: wireframe textual, jerarquía, comportamiento y estados. Debe poder revisarse en 2 minutos por alguien no técnico.

### Paso 4 — Punto de control

Presentar tokens y/o spec al usuario y **esperar aprobación explícita antes de pasar a código**. Si el usuario pide cambios, ajustar la spec, no saltar al código. Corregir una spec cuesta segundos; corregir código construido cuesta iteraciones.

## Reglas no negociables

Estas reglas aplican a toda spec generada, sin excepción:

- **Estados obligatorios**: toda vista define qué muestra en carga, vacío, error y éxito. Un empty state nunca es una pantalla en blanco: incluye ícono/ilustración, mensaje de una línea y acción sugerida.
- **Accesibilidad mínima**: contraste AA (4.5:1 texto normal, 3:1 texto grande), foco visible en todo elemento interactivo, labels en todo campo de formulario.
- **Nada hardcodeado**: la spec referencia tokens por nombre (`--color-acento`, `spacing-4`), nunca valores sueltos. Si una pantalla "necesita" un color nuevo, se agrega al sistema de tokens con rol asignado, no se inventa en la pantalla.
- **Mobile-first**: toda spec define el comportamiento en móvil (≤640px) y escritorio. Si solo se describe uno, la spec está incompleta.
- **Máximo 2 familias tipográficas y 1 color de acento primario** por producto. La sobriedad es una decisión, no una limitación.
- **Jerarquía única**: cada pantalla tiene UN elemento protagonista. Si la spec no puede nombrar cuál es, la pantalla está mal planteada.

## Contrato con frontend-saas

Al terminar, la spec cierra con esta línea literal para que la skill de frontend la reconozca:

```
> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
```

## Errores comunes a evitar

- Generar código React "de una vez" porque la pantalla parece simple → NO: la spec existe siempre, aunque sea de 15 líneas.
- Paletas con 6+ colores sin rol → señal de diseño débil; volver a la regla 60-30-10 del proceso.
- Copiar el look de shadcn/Tailwind UI por defecto → el proceso de identidad existe justamente para evitar el look genérico de plantilla.
- Preguntar al usuario cosas que ya respondió o que ya están en tokens.md existente.
