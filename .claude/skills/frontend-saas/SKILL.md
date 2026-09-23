---
name: frontend-saas
description: Implementa interfaces de productos SaaS en React + Tailwind a partir del design spec y los tokens generados por la skill disenador-ui. Usar siempre que el usuario pida implementar, construir, programar, codear o "pasar a código" una pantalla, vista, dashboard, componente o el frontend de una app SaaS, o cuando exista una spec aprobada en design/ lista para implementar. También cubre corregir, ajustar o extender código frontend existente del proyecto. Nunca implementar UI sin verificar primero si existe design/tokens.md y la spec correspondiente.
---

# Frontend SaaS — Implementación desde el contrato de diseño

## Regla de entrada (siempre, antes de escribir código)

Verificar en el proyecto:

```
¿Existe design/tokens.md Y design/spec-<pantalla>.md para lo pedido?
├── SÍ  → Son el CONTRATO. Leerlos completos e implementar exactamente eso.
├── Tokens sí, spec no → Generar primero la spec (skill disenador-ui), aprobar, luego código.
└── Nada → Activar la skill disenador-ui desde cero. NO improvisar diseño en el código.
```

El mockup (`design/mockup-*.html`) es referencia visual de aceptación: el resultado final debe verse como el mockup, pero se implementa desde la spec. Si spec y mockup difieren, manda la spec.

**Desviaciones**: si durante la implementación algo de la spec resulta inviable o claramente mejorable, NO desviarse en silencio — proponer el cambio al usuario, actualizar la spec si acepta, y entonces implementar. La spec siempre refleja lo construido.

## Stack y estructura

Si el proyecto ya tiene framework definido (por decisión de arquitectura o código existente), respetarlo. Para proyecto nuevo sin decisión previa, el default es **Next.js (App Router) + Tailwind + TypeScript**, desplegable en Vercel, con Supabase como backend (lo conecta otra skill; aquí solo se consume).

```
src/
├── app/                  # Rutas (App Router)
├── components/
│   ├── ui/               # Primitivos reutilizables (Button, Card, Badge, Input…)
│   └── <dominio>/        # Componentes de feature (VencimientosTable, KpiCard…)
├── lib/                  # Utilidades, clientes, helpers
└── styles/globals.css    # Variables CSS de los tokens
```

Convenciones: un componente por archivo, PascalCase, props tipadas. Componentes de `ui/` no conocen el dominio; componentes de dominio componen los de `ui/`.

## Tokens: fuente única de estilo

1. Al iniciar, trasladar `design/tokens.md` al código: bloque CSS → `styles/globals.css`, bloque Tailwind → `tailwind.config`.
2. A partir de ahí, **prohibido** el color, tamaño o fuente literal en componentes: siempre clases de tokens (`bg-superficie`, `text-texto-sec`, `border-borde`, `font-display`). Si aparece un `#hex` o un `text-[15px]` en un componente, es un defecto.
3. Si una pantalla necesita un valor que no existe en tokens, se agrega al sistema (tokens.md + config) con rol y nombre, nunca inline.
4. Prohibido usar la paleta default de Tailwind (`gray-*`, `blue-*`, `slate-*`) — esos son exactamente los grises puros y azules genéricos que el sistema de diseño reemplaza.

## Estados: no negociables en cada vista

Toda vista o componente con datos implementa los 4 estados definidos en su spec:

| Estado | Implementación estándar |
|---|---|
| Carga | Skeleton con las mismas dimensiones del contenido real (listas, cards, tablas); spinner solo en acciones puntuales. Nunca layout shift |
| Vacío | Componente `EmptyState` reutilizable de `ui/`: ícono + mensaje + acción, según texto de la spec |
| Error | Mensaje humano + acción de recuperación (reintentar). Errores de sección degradan la sección, no la página |
| Éxito | Toast para acciones menores; confirmación para flujos largos |

Mientras no exista backend, implementar con datos de ejemplo realistas en `lib/mock-data.ts` claramente marcados, con la misma forma (tipos) que tendrá la API real — así el cambio a datos reales no toca componentes.

## Proceso de implementación

1. **Leer** tokens + spec completos (+ mirar el mockup).
2. **Plan de componentes**: listar en 5–10 líneas qué componentes se crean/reutilizan, según la tabla de componentes de la spec. Mostrarlo al usuario solo si la pantalla es grande o hay decisiones dudosas; si es directo, proceder.
3. **Implementar** en orden: tokens → primitivos `ui/` faltantes → componentes de dominio → página. Mobile-first: estilos base = móvil, `md:`/`lg:` = escritorio, según la sección móvil de la spec.
4. **Autoverificación** con la checklist de `references/checklist-calidad.md` (leerla al terminar cada pantalla).
5. **Entregar** indicando cómo verlo corriendo y qué comparar contra el mockup.

Para patrones concretos de implementación (tablas responsivas, formularios con validación, skeletons, toasts, sidebar/navegación), leer `references/patrones-implementacion.md` antes de construir ese tipo de componente.

## Errores comunes a evitar

- Instalar librerías de componentes (shadcn/ui, MUI, Chakra) por defecto → los primitivos se construyen con Tailwind + tokens propios; una librería solo si el usuario la pide o ya está en el proyecto.
- "Mejorar" el diseño al implementarlo (cambiar espaciados, agregar sombras, otro color) → el contrato existe para eso; proponer, no improvisar.
- Componentes gigantes de 300+ líneas → dividir cuando un componente supere ~150 líneas o mezcle responsabilidades.
- Implementar solo el happy path y dejar los estados "para después" → los 4 estados entran en la misma entrega.
- `useEffect` para datos derivados o duplicar estado que puede calcularse → derivar en render; estado mínimo.
