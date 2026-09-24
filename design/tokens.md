# Tokens — CrubolDocs (v1)

> Base: preset **Hex Core** (Crubol / BC-Tech), extendido para un producto denso en datos. Estado: **pendiente de aprobación de Fernando** (2026-09-23).

## 1. Identidad

- **Producto:** CrubolDocs — control documental y gestión de riesgos para sistemas de gestión (ISO 9001 y afines).
- **Personalidad:** confiable, precisa, clara. Sobria y densa en datos, sin ruido; el color se reserva para estado y acción.
- **Público:** Líder SIG, líderes de proceso, elaboradores, revisores, aprobadores, responsables de control, auditores y personal de consulta. Uso diario en escritorio y consulta ocasional en el celular. **Solo modo claro en v1** (los valores oscuros del preset quedan reservados).

## 2. Paleta con roles

### Marca y neutros (preset Hex Core)
| Rol | Token | Valor | Uso |
|---|---|---|---|
| Acento primario | `--color-acento` | `#0B7285` | Botón primario, links, ítem de navegación activo, foco. 5.6:1 sobre blanco |
| Acento hover | `--color-acento-hover` | `#095C6B` | Hover/pressed del botón primario y links. *Extensión:* el `acento-medio` no da AA con texto blanco |
| Acento medio | `--color-acento-medio` | `#15AABF` | Solo decorativo: anillo de foco sobre fondos oscuros, motivo hexagonal, gráficos. **Nunca con texto encima** |
| Acento claro | `--color-acento-claro` | `#63E6BE` | Solo decorativo: marca, detalles del hexágono. Nunca texto |
| Acento suave | `--color-acento-suave` | `#E3F4F6` | Fondo del ítem activo del sidebar, fila seleccionada, badge info. *Extensión* |
| Fondo | `--color-fondo` | `#F8FAFB` | Fondo general de la app |
| Superficie | `--color-superficie` | `#FFFFFF` | Cards, paneles, tablas, modales, sidebar |
| Superficie alterna | `--color-superficie-alt` | `#EEF2F4` | Cabecera de tablas, hover de filas, skeletons, badge neutro. *Extensión* |
| Borde | `--color-borde` | `#E3E8EC` | Divisores, bordes de inputs y cards |
| Borde fuerte | `--color-borde-fuerte` | `#C5CFD6` | Borde de inputs en reposo (3:1 sobre blanco no aplica a bordes decorativos; se usa para que el campo se distinga). *Extensión* |
| Texto primario | `--color-texto` | `#12232B` | Títulos y cuerpo |
| Texto secundario | `--color-texto-sec` | `#5C6F7A` | Metadatos, descripciones, placeholders. 5.0:1 sobre fondo |

### Semánticos (preset + variantes de texto para cumplir AA)
El color base del preset se usa en íconos, bordes y puntos de estado. Para **texto** se usa la variante `-texto` sobre la variante `-suave`.

| Rol | Base (ícono/borde) | Texto | Fondo suave | Contraste texto/suave |
|---|---|---|---|---|
| Éxito | `--color-exito` `#2F9E6E` | `--color-exito-texto` `#1B7A52` | `--color-exito-suave` `#E6F4EE` | 4.7:1 |
| Advertencia | `--color-advertencia` `#E8A13C` | `--color-advertencia-texto` `#8A5A0B` | `--color-advertencia-suave` `#FDF3E3` | 5.4:1 |
| Error / destructivo | `--color-error` `#D64550` | `--color-error-texto` `#B3303B` | `--color-error-suave` `#FBEAEB` | 5.3:1 |
| Info | `--color-info` `#15AABF` | `--color-acento` `#0B7285` | `--color-acento-suave` `#E3F4F6` | 4.9:1 |

Botón destructivo: fondo `--color-error-texto` (`#B3303B`) con texto blanco (6.2:1).

### Estados de documento (mapa fijo, no se inventan otros)
| Estado | Badge (texto / fondo) |
|---|---|
| Borrador | `texto-sec` / `superficie-alt` |
| En revisión | `advertencia-texto` / `advertencia-suave` |
| En aprobación | `advertencia-texto` / `advertencia-suave` + ícono de firma |
| Vigente | `exito-texto` / `exito-suave` |
| Obsoleto / Reemplazada | `texto-sec` / `superficie-alt`, texto tachado no; ícono de archivo |
| Revisión vencida (marca adicional) | `error-texto` / `error-suave` |

### Niveles de riesgo (matriz 5×5) — rol exclusivo de la matriz y sus badges
| Nivel | Token | Valor | Texto encima | Contraste |
|---|---|---|---|---|
| Bajo | `--color-riesgo-bajo` | `#8CE0B8` | `texto` | 10.4:1 |
| Moderado | `--color-riesgo-moderado` | `#F4C95D` | `texto` | 10.3:1 |
| Alto | `--color-riesgo-alto` | `#F2994A` | `texto` | 7.3:1 |
| Extremo | `--color-riesgo-extremo` | `#C92A3A` | blanco | 5.4:1 |

El nivel siempre va acompañado de su **nombre** (no solo color). Rango por defecto P×I: 1–4 bajo, 5–9 moderado, 10–16 alto, 20–25 extremo (configurable por organización en `risk_scale`).

**Regla 60-30-10:** 60 % neutros (fondo/superficie), 30 % texto y bordes, 10 % acento. Los colores de riesgo y estado solo aparecen donde comunican estado.

**Gradiente de marca** `linear-gradient(135deg, #0B7285, #15AABF, #63E6BE)`: solo en el panel de marca de `/login` y el logo. Nunca en la app.

## 3. Tipografía

| Estilo | Familia | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|---|
| h1 | Space Grotesk | 28/36 (móvil 24/32) | 600 | Título de pantalla (uno por vista) |
| h2 | Space Grotesk | 20/28 | 600 | Título de sección o card |
| h3 | Space Grotesk | 16/24 | 500 | Subsección, título de panel |
| kpi | Space Grotesk | 28/32 | 600 | Cifras de resumen |
| body | IBM Plex Sans | 14/22 | 400 | Texto general y tablas (densidad de app) |
| body-lg | IBM Plex Sans | 15/24 | 400 | Párrafos de lectura (descripciones, comentarios) |
| small | IBM Plex Sans | 13/20 | 400 | Metadatos, ayuda de campos |
| label | IBM Plex Sans | 13/20 | 500 | Labels de formulario, encabezados de tabla |
| caption | IBM Plex Sans | 12/16 | 500, mayúsculas, tracking 0.04em | Rótulos de grupo del sidebar, ejes de la matriz |
| mono | IBM Plex Mono | 13/20 | 400 | Códigos de documento (`PR-GC-003`), versión, hash |

Dos familias de UI (Space Grotesk + IBM Plex Sans); IBM Plex Mono es la variante monoespaciada de la misma familia Plex, solo para códigos. Ajuste frente al preset: body 14 en vez de 15 porque la app es de tablas; h1 28 en vez de 32.

## 4. Espaciado

Escala de 4 px: `1`=4 · `2`=8 · `3`=12 · `4`=16 · `6`=24 · `8`=32 · `12`=48 · `16`=64.

- Padding de card: 24 (móvil 16). Padding de celda de tabla: 12 vertical / 16 horizontal.
- Separación entre secciones: 32 en app (48–64 solo en login).
- Gutter lateral: 32 escritorio · 16 móvil.
- Altura de controles: 36 (botón/input estándar) · 44 mínimo en móvil (área táctil).

## 5. Radios y sombras

| Nivel | Radio | Uso | Sombra | Uso |
|---|---|---|---|---|
| sm | 6px | Inputs, badges, celdas de la matriz | `0 1px 2px rgba(18,35,43,.06)` | Cards en reposo (opcional) |
| md | 10px | Cards, botones, panel lateral | `0 4px 12px rgba(18,35,43,.08)` | Menús, popovers, toasts |
| lg | 16px | Modales, panel de marca del login | `0 12px 32px rgba(18,35,43,.12)` | Modales, panel lateral (drawer) |

Se prefieren bordes sobre sombras. **Motivo hexagonal:** logo, contenedor del ícono en estados vacíos y KPIs, patrón de fondo muy tenue (opacidad ≤ 6 %) en el login. Nunca decoración masiva.

## 6. Foco, movimiento e íconos

- **Foco visible:** `outline: 2px solid var(--color-acento); outline-offset: 2px` en todo elemento interactivo (`:focus-visible`).
- **Transiciones:** 150 ms ease-out (hover, estados). Drawer: 200 ms. Respetar `prefers-reduced-motion`.
- **Íconos:** trazo 1.5 px, 16/20 px, set `lucide` (el que usa shadcn/ui). Siempre con texto o `aria-label`.

## 7. Salida técnica

El proyecto usa **Tailwind v4** (sin `tailwind.config`): los tokens se declaran en `src/app/globals.css` con `@theme`. Fuentes con `next/font/google` (sin dependencia nueva).

```css
@import "tailwindcss";

:root {
  --color-acento: #0B7285;
  --color-acento-hover: #095C6B;
  --color-acento-medio: #15AABF;
  --color-acento-claro: #63E6BE;
  --color-acento-suave: #E3F4F6;
  --color-fondo: #F8FAFB;
  --color-superficie: #FFFFFF;
  --color-superficie-alt: #EEF2F4;
  --color-borde: #E3E8EC;
  --color-borde-fuerte: #C5CFD6;
  --color-texto: #12232B;
  --color-texto-sec: #5C6F7A;
  --color-exito: #2F9E6E;
  --color-exito-texto: #1B7A52;
  --color-exito-suave: #E6F4EE;
  --color-advertencia: #E8A13C;
  --color-advertencia-texto: #8A5A0B;
  --color-advertencia-suave: #FDF3E3;
  --color-error: #D64550;
  --color-error-texto: #B3303B;
  --color-error-suave: #FBEAEB;
  --color-info: #15AABF;
  --color-riesgo-bajo: #8CE0B8;
  --color-riesgo-moderado: #F4C95D;
  --color-riesgo-alto: #F2994A;
  --color-riesgo-extremo: #C92A3A;
  --radio-sm: 6px; --radio-md: 10px; --radio-lg: 16px;
  --sombra-sm: 0 1px 2px rgba(18,35,43,.06);
  --sombra-md: 0 4px 12px rgba(18,35,43,.08);
  --sombra-lg: 0 12px 32px rgba(18,35,43,.12);
}

@theme inline {
  --color-acento: var(--color-acento);
  --color-acento-hover: var(--color-acento-hover);
  --color-acento-medio: var(--color-acento-medio);
  --color-acento-claro: var(--color-acento-claro);
  --color-acento-suave: var(--color-acento-suave);
  --color-fondo: var(--color-fondo);
  --color-superficie: var(--color-superficie);
  --color-superficie-alt: var(--color-superficie-alt);
  --color-borde: var(--color-borde);
  --color-borde-fuerte: var(--color-borde-fuerte);
  --color-texto: var(--color-texto);
  --color-texto-sec: var(--color-texto-sec);
  --color-exito: var(--color-exito);
  --color-exito-texto: var(--color-exito-texto);
  --color-exito-suave: var(--color-exito-suave);
  --color-advertencia: var(--color-advertencia);
  --color-advertencia-texto: var(--color-advertencia-texto);
  --color-advertencia-suave: var(--color-advertencia-suave);
  --color-error: var(--color-error);
  --color-error-texto: var(--color-error-texto);
  --color-error-suave: var(--color-error-suave);
  --color-info: var(--color-info);
  --color-riesgo-bajo: var(--color-riesgo-bajo);
  --color-riesgo-moderado: var(--color-riesgo-moderado);
  --color-riesgo-alto: var(--color-riesgo-alto);
  --color-riesgo-extremo: var(--color-riesgo-extremo);
  --radius-sm: var(--radio-sm);
  --radius-md: var(--radio-md);
  --radius-lg: var(--radio-lg);
  --shadow-sm: var(--sombra-sm);
  --shadow-md: var(--sombra-md);
  --shadow-lg: var(--sombra-lg);
  --font-display: var(--font-space-grotesk), sans-serif;
  --font-sans: var(--font-plex-sans), sans-serif;
  --font-mono: var(--font-plex-mono), monospace;
}

body { background: var(--color-fondo); color: var(--color-texto); }
:focus-visible { outline: 2px solid var(--color-acento); outline-offset: 2px; }
```

Uso en clases: `bg-acento hover:bg-acento-hover text-white`, `bg-superficie border-borde`, `text-texto-sec`, `rounded-md shadow-md`, `font-display`, `bg-riesgo-alto`.

Equivalente para referencia (Tailwind v3 / shadcn):

```js
// tailwind.config — extend (solo si se migra a config JS)
colors: {
  acento: { DEFAULT: '#0B7285', hover: '#095C6B', medio: '#15AABF', claro: '#63E6BE', suave: '#E3F4F6' },
  fondo: '#F8FAFB', superficie: { DEFAULT: '#FFFFFF', alt: '#EEF2F4' },
  borde: { DEFAULT: '#E3E8EC', fuerte: '#C5CFD6' },
  texto: { DEFAULT: '#12232B', sec: '#5C6F7A' },
  exito: { DEFAULT: '#2F9E6E', texto: '#1B7A52', suave: '#E6F4EE' },
  advertencia: { DEFAULT: '#E8A13C', texto: '#8A5A0B', suave: '#FDF3E3' },
  error: { DEFAULT: '#D64550', texto: '#B3303B', suave: '#FBEAEB' },
  riesgo: { bajo: '#8CE0B8', moderado: '#F4C95D', alto: '#F2994A', extremo: '#C92A3A' },
},
fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],
  sans: ['IBM Plex Sans', 'sans-serif'],
  mono: ['IBM Plex Mono', 'monospace'],
}
```

**shadcn/ui:** mapear sus variables a estos tokens (`--primary` → acento, `--destructive` → error-texto, `--muted` → superficie-alt, `--border` → borde, `--ring` → acento, `--radius` → 10px). Sin el look por defecto de shadcn.
