# Patrones de implementación — Componentes SaaS

Leer la sección correspondiente antes de construir ese tipo de componente. Todos los ejemplos asumen tokens ya configurados en Tailwind.

## Primitivos ui/ (el set mínimo)

Construir solo los que la pantalla necesite, en este orden de aparición típico: `Button` (variantes primary/secondary/ghost/destructive + estado loading), `Card`, `Badge` (variantes semánticas: exito/advertencia/error/info/neutral), `Input` + `Label` + `FieldError`, `EmptyState`, `Skeleton`, `Toast`, `Modal`, `Tabs`, `DropdownMenu`.

Reglas transversales:
- Todo interactivo: `focus-visible:ring-2 ring-acento` y estados hover/active/disabled definidos.
- Variantes por prop (`variant`, `size`), nunca clases pasadas desde afuera para cambiar la esencia del componente.
- Badge de estado SIEMPRE ícono + texto (nunca solo color — accesibilidad y daltonismo).

## Tabla de datos responsiva

- Escritorio: `<table>` semántica real (no divs), `thead` sticky si la lista supera el viewport, columnas según la spec.
- Móvil (`< md`): la tabla NO se renderiza — se renderiza una lista de `Card` con los 3 campos clave definidos en la spec. Son dos renders del mismo dato, no CSS que "aprieta" la tabla.
- Ordenamiento: en el header, con indicador de dirección y `aria-sort`.
- Fila clickeable: toda la fila navega, pero los botones de acción hacen `stopPropagation`.
- Acciones destructivas: siempre modal de confirmación que nombra el objeto ("¿Eliminar el certificado api.acme.co?").

## Formularios

- Validación con estado local o librería ligera si ya está en el proyecto; mensajes bajo el campo con `aria-describedby`, tono "cómo corregirlo".
- Submit: botón deshabilitado + spinner durante el envío; deshabilitar doble submit; al éxito, lo que diga la spec (toast/redirect).
- Inputs controlados; valores numéricos y fechas siempre parseados en un solo lugar (`lib/`), no en el componente.

## Skeletons

- Un skeleton por componente de contenido (`KpiCardSkeleton`, `TableSkeleton`), mismas dimensiones que el contenido real para evitar saltos.
- Animación `animate-pulse` sobre bloques `bg-borde/60 rounded`.
- Duración: si los datos llegan en <300ms no mostrar skeleton (parpadeo); usar un pequeño delay de aparición.

## Toasts

- Provider único a nivel de layout; hook `useToast()`.
- Auto-dismiss 4s, apilables máximo 3, `aria-live="polite"`.
- Solo para resultados de acciones; nunca para errores de carga de página (esos van en la vista).

## Navegación (shell)

- Sidebar: estado activo con fondo sutil (`bg-acento/8`) + texto acento, no solo cambio de color de texto.
- Colapso en escritorio persistido (localStorage); en móvil la spec define bottom bar o drawer — implementar ese, no ambos.
- Breadcrumb desde la estructura de rutas, no hardcodeado.

## Gráficos

- Librería: Recharts como default (ligera y suficiente para dashboards); solo cambiar si el proyecto ya usa otra.
- Colores de series desde tokens (acento y sus variantes), nunca la paleta default de la librería.
- Tooltip con la tipografía del sistema; ejes con `text-texto-sec` y grid con `border-borde`.
- Accesibilidad mínima: título del gráfico como texto real (no solo dentro del SVG) y resumen del dato clave en texto.

## Datos mock

```ts
// lib/mock-data.ts
export interface Activo { /* tipos = forma futura de la API */ }
export const activosMock: Activo[] = [ /* datos verosímiles del dominio */ ];
```

- Nombres, fechas y cifras creíbles del dominio del producto (los de la spec/mockup sirven).
- Fechas relativas a `new Date()` para que los estados (vencido/crítico/próximo) se calculen de verdad y la lógica semántica quede implementada desde ya.
