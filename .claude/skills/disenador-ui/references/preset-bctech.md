# Preset BC-Tech — Sistema Hex Core

Base de diseño para todo producto de BC-Tech S.A.S. Se usa como punto de partida: los productos pueden extenderlo (agregar semánticos, ajustar densidad) pero nunca contradecirlo (cambiar acento, tipografías o el motivo hexagonal).

## Esencia de marca

- **Concepto**: "Seguridad que habilita" — la tecnología como facilitador, no como obstáculo.
- **Personalidad**: fresca, precisa, confiable. Ligera visualmente, nunca cargada.
- **Motivo gráfico**: hexágono abierto (no cerrado) — estructura sin encierro. Se usa en patrones de fondo sutiles, bullets, contenedores de íconos y separadores. Nunca como decoración masiva.

## Paleta con roles

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Acento primario | `--color-acento` | `#0B7285` | CTAs, links, elementos activos |
| Acento medio | `--color-acento-medio` | `#15AABF` | Hover, gradientes, gráficos |
| Acento claro | `--color-acento-claro` | `#63E6BE` | Highlights, badges, éxito suave, gradientes |
| Fondo | `--color-fondo` | `#F8FAFB` | Fondo general de la app |
| Superficie | `--color-superficie` | `#FFFFFF` | Cards, paneles, modales |
| Borde | `--color-borde` | `#E3E8EC` | Divisores, bordes de inputs y cards |
| Texto primario | `--color-texto` | `#12232B` | Títulos y cuerpo principal |
| Texto secundario | `--color-texto-sec` | `#5C6F7A` | Descripciones, metadata, placeholders |
| Éxito | `--color-exito` | `#2F9E6E` | Confirmaciones |
| Advertencia | `--color-advertencia` | `#E8A13C` | Alertas medias |
| Error | `--color-error` | `#D64550` | Errores, destructivo |
| Info | `--color-info` | `#15AABF` | Mensajes informativos (reusa acento medio) |

**Gradiente de marca**: `linear-gradient(135deg, #0B7285, #15AABF, #63E6BE)` — solo en héroe de landing, portadas y el logo. Nunca en botones ni texto de la app.

**Modo oscuro** (si el producto lo requiere): fondo `#0D1B21`, superficie `#13252D`, borde `#1F3640`, texto `#E8F1F4`, texto secundario `#8FA6B0`. Acentos se mantienen; verificar contraste AA del acento primario sobre fondo oscuro (usar `#15AABF` como acento activo en dark).

## Tipografía

| Uso | Familia | Detalle |
|---|---|---|
| Display / títulos | Space Grotesk | h1 32/40 semibold · h2 24/32 semibold · h3 18/26 medium |
| Texto / UI | IBM Plex Sans | body 15/24 regular · small 13/20 regular · caption 12/16 medium mayúsculas espaciadas |
| Datos / código | IBM Plex Mono | cifras en tablas y bloques técnicos (opcional) |

Regla: Space Grotesk nunca en párrafos largos; IBM Plex Sans nunca en el logo o héroes.

## Espaciado, radios y sombras

- Espaciado: escala 4px — usar 4, 8, 12, 16, 24, 32, 48, 64. Padding interno de cards: 24. Separación entre secciones: 48–64.
- Radios: `sm` 6px (inputs, badges) · `md` 10px (cards, botones) · `lg` 16px (modales, héroes). El hexágono es la única forma angular permitida.
- Sombras: `sm` `0 1px 2px rgba(18,35,43,.06)` · `md` `0 4px 12px rgba(18,35,43,.08)` · `lg` `0 12px 32px rgba(18,35,43,.12)`. Preferir bordes sobre sombras; sombra solo para elementos flotantes.

## Salida técnica

Al generar `design/tokens.md` para un producto BC-Tech, incluir estos bloques listos para copiar:

```css
:root {
  --color-acento: #0B7285;
  --color-acento-medio: #15AABF;
  --color-acento-claro: #63E6BE;
  --color-fondo: #F8FAFB;
  --color-superficie: #FFFFFF;
  --color-borde: #E3E8EC;
  --color-texto: #12232B;
  --color-texto-sec: #5C6F7A;
  --color-exito: #2F9E6E;
  --color-advertencia: #E8A13C;
  --color-error: #D64550;
  --radio-sm: 6px; --radio-md: 10px; --radio-lg: 16px;
}
```

```js
// tailwind.config — extend
colors: {
  acento: { DEFAULT: '#0B7285', medio: '#15AABF', claro: '#63E6BE' },
  fondo: '#F8FAFB', superficie: '#FFFFFF', borde: '#E3E8EC',
  texto: { DEFAULT: '#12232B', sec: '#5C6F7A' },
  exito: '#2F9E6E', advertencia: '#E8A13C', error: '#D64550',
},
fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],
  sans: ['IBM Plex Sans', 'sans-serif'],
  mono: ['IBM Plex Mono', 'monospace'],
}
```

## Nota sobre el nombre de la empresa

Si el usuario indica que la marca cambió de nombre (BC-Tech está en revisión), conservar todo el sistema Hex Core y solo actualizar el nombre en los artefactos — la identidad visual sobrevive al renombre salvo instrucción contraria.
