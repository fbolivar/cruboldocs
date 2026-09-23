# Patrones UX de SaaS — Obligatorios por tipo de vista

Leer la sección correspondiente antes de escribir la spec de ese tipo de pantalla.

## Estructura general de la app (shell)

- **Navegación**: sidebar izquierda colapsable (escritorio) → bottom bar o menú hamburguesa (móvil). Máximo 7 ítems de primer nivel; si hay más, agrupar.
- **Topbar**: breadcrumb o título de sección + buscador global (si aplica) + avatar/menú de cuenta. Nada más.
- **Ancho de contenido**: máximo 1200–1280px centrado en vistas de lectura; full-width solo en tablas densas y dashboards.

## Dashboard

- Jerarquía en 3 niveles: (1) fila de KPIs (3–5 tarjetas, no más), (2) gráfico o visual protagonista, (3) detalle secundario (tabla resumida, actividad reciente).
- Cada KPI: valor grande + etiqueta + variación vs. período anterior con dirección (↑↓ y color semántico).
- Todo dashboard declara su **rango temporal visible** y cómo se cambia.
- Prohibido: más de 2 tipos de gráfico distintos en la primera vista; gráficos de pastel para más de 4 categorías.

## Tablas de datos

- Columnas: máximo 6–7 visibles por defecto; el resto tras "columnas" configurable o en el detalle de fila.
- Obligatorio definir: ordenamiento (qué columnas), filtros (cuáles y dónde viven), búsqueda, paginación (tamaño por defecto 25), y qué pasa al hacer clic en una fila (detalle lateral, página, nada).
- Acciones por fila: máximo 2 visibles + menú "⋯" para el resto. Acciones destructivas siempre con confirmación.
- En móvil la tabla NO se encoge: se transforma en lista de cards con los 3 campos clave.

## Formularios

- Una columna. Labels arriba del campo, nunca placeholder-como-label.
- Agrupar en secciones con título si hay más de 6 campos; considerar wizard si hay más de 12.
- Validación: inline al perder foco, resumen de errores arriba al enviar. Mensajes de error dicen CÓMO corregir ("El NIT debe tener 9 dígitos"), no solo que está mal.
- Botón primario: verbo específico ("Crear reporte", no "Enviar"). Secundario: texto plano o ghost.
- Definir estado del botón durante envío (spinner + deshabilitado) y qué pasa al éxito (redirección, toast, limpieza).

## Onboarding / primer uso

- Máximo 3 pasos antes de que el usuario vea valor. Pedir solo lo indispensable; el resto se completa después.
- El primer login nunca aterriza en una pantalla vacía: aterriza en un empty state accionable o en datos de ejemplo marcados como demo.
- Barra de progreso o checklist visible si el setup tiene tareas pendientes.

## Estados (aplica a TODA vista)

| Estado | Qué debe definir la spec |
|---|---|
| Carga | Skeleton (preferido para listas/cards) o spinner (acciones puntuales). Nunca pantalla en blanco >300ms |
| Vacío | Ícono o ilustración pequeña + mensaje de 1 línea + botón de acción principal ("Crea tu primer reporte") |
| Error | Qué falló en lenguaje humano + acción de recuperación (reintentar, volver, soporte) |
| Éxito | Toast (acciones menores) o pantalla de confirmación (flujos largos: pago, setup) |
| Parcial | Si algunos datos cargan y otros fallan, la vista degrada por sección, no completa |

## Landing / página comercial

- Estructura: héroe (promesa en 1 frase + subtítulo + CTA + visual del producto) → prueba social → 3 beneficios (no features) → cómo funciona (3 pasos) → precios → FAQ → CTA final.
- Un solo CTA primario repetido; los secundarios no compiten en color.
- El héroe responde en 5 segundos: qué es, para quién, qué gano.

## Micro-interacciones

- Transiciones 150–200ms ease-out en hover/estados. Nada que rebote o gire salvo pedido explícito.
- Feedback inmediato a todo clic (estado activo, ripple sutil o cambio visual <100ms).
- Toasts: 4s auto-dismiss, esquina inferior derecha (escritorio) / superior (móvil), apilables máximo 3.
