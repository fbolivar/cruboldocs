# Checklist de calidad — Pasar antes de entregar cada pantalla

Recorrer completa al terminar. Si un punto falla, corregir antes de mostrar al usuario. Reportar el resultado en 3–5 líneas al entregar ("checklist: todo pasa" o qué quedó pendiente y por qué).

## Fidelidad al contrato

- [ ] La pantalla implementa TODO lo que dice su spec (zonas, jerarquía, acción primaria) — releer la spec al final, no de memoria
- [ ] Visualmente corresponde al mockup (layout, proporciones, densidad)
- [ ] Cualquier desviación fue consultada y la spec actualizada — cero desviaciones silenciosas

## Tokens y estilo

- [ ] Cero valores literales en componentes: ni `#hex`, ni `text-[Npx]`, ni colores default de Tailwind (`gray-*`, `blue-*`, `slate-*`)
- [ ] Tipografías correctas por rol (display en títulos, sans en UI, mono donde la spec lo pida)
- [ ] Espaciados solo de la escala de tokens

## Estados

- [ ] Carga: skeleton sin layout shift
- [ ] Vacío: EmptyState con mensaje y acción de la spec
- [ ] Error: mensaje humano + recuperación; error de sección no tumba la página
- [ ] Éxito: feedback según spec
- [ ] Probado alternando los 4 estados con los datos mock (forzarlos, no asumirlos)

## Responsive

- [ ] Móvil 390px: sin scroll horizontal, transformaciones de la spec aplicadas (tabla→cards, navegación móvil)
- [ ] Escritorio 1440px: anchos máximos respetados
- [ ] Targets táctiles ≥ 44px en móvil

## Accesibilidad

- [ ] Contraste AA en todo texto (verificar especialmente texto secundario sobre superficies)
- [ ] Foco visible navegando con Tab en orden lógico; sin trampas de foco en modales
- [ ] Todo input con label asociado; imágenes/íconos informativos con texto alternativo; íconos decorativos con `aria-hidden`
- [ ] Estado nunca comunicado solo por color

## Código

- [ ] TypeScript sin `any` sueltos; props tipadas
- [ ] Componentes < ~150 líneas y una responsabilidad
- [ ] Sin `console.log`, código muerto ni imports sin usar
- [ ] Datos mock tipados con la forma futura de la API, aislados en `lib/`
- [ ] `npm run build` (o el build del proyecto) pasa sin errores ni warnings nuevos

## Rendimiento

- [ ] Imágenes con dimensiones definidas y lazy loading fuera del viewport inicial
- [ ] Sin dependencias nuevas injustificadas (revisar si ya había algo en el proyecto que lo resuelve)
- [ ] Fuentes cargadas con `display: swap` y solo los pesos usados
