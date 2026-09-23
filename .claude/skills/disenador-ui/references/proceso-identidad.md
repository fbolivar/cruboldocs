# Proceso de identidad — Productos fuera de BC-Tech

Cómo derivar un sistema de diseño propio para un producto o cliente nuevo, evitando el look genérico de plantilla.

## Paso 1 — Entrevista mínima (1 solo mensaje al usuario)

Preguntar únicamente lo que no esté ya en la conversación:

1. **Personalidad** en 3 adjetivos (ej: "sobrio, técnico, premium" / "cálido, simple, cercano")
2. **Público**: ¿quién lo usa y en qué contexto? (gerente en escritorio ≠ operario en móvil)
3. **Color semilla**: ¿hay un color de marca existente, o lo derivamos de la personalidad?
4. **Modo**: claro, oscuro o ambos
5. **Referencia**: ¿algún producto cuya estética admire? (opcional)

## Paso 2 — Derivar la paleta (regla 60-30-10)

- **60% neutros**: fondo + superficie + bordes. Derivarlos TEÑIDOS del color semilla (nunca grises puros #F5F5F5): tomar el matiz del acento y desaturarlo a 3–8% con luminosidad 96–99% para fondo. Esto es lo que hace que un producto se sienta "diseñado".
- **30% texto**: primario casi-negro teñido del mismo matiz (no #000), secundario al ~55% de luminosidad.
- **10% acento**: UN color protagonista. Hover = mismo matiz, −8% luminosidad.
- **Semánticos**: éxito/advertencia/error/info armonizados con la paleta (ajustar saturación para que convivan, no los defaults de Tailwind).

Mapeo personalidad → decisión de color:

| Personalidad | Dirección |
|---|---|
| Sobrio, corporativo, financiero | Azules profundos, verdes bosque, saturación media-baja |
| Técnico, seguridad, datos | Teal, cian, índigo; considerar modo oscuro por defecto |
| Cálido, humano, consumo | Coral, ámbar, terracota; neutros cálidos |
| Premium, editorial | Casi-monocromo + un acento quirúrgico; mucho blanco |
| Salud, bienestar | Verdes salvia, azules suaves, alta luminosidad |

## Paso 3 — Tipografía (máximo 2 familias)

Elegir un par con intención, no `Inter` por defecto:

| Personalidad | Display | Texto |
|---|---|---|
| Técnico / moderno | Space Grotesk, Sora, Chakra Petch | IBM Plex Sans, Inter |
| Corporativo / confiable | Archivo, Libre Franklin | Source Sans 3, Public Sans |
| Editorial / premium | Fraunces, Newsreader, Libre Caslon | Inter, Source Serif 4 |
| Cálido / cercano | Bricolage Grotesque, Outfit | Nunito Sans, Karla |
| Datos / denso | — (usar la de texto en bold) | IBM Plex Sans + IBM Plex Mono para cifras |

Escala fija: h1 32/40 · h2 24/32 · h3 18/26 · body 15/24 · small 13/20 · caption 12/16. Ajustar ±10% solo si el producto es muy denso (dashboards) o muy aireado (landing).

## Paso 4 — Resto del sistema

- Espaciado: escala de 4px (4–64). Densidad alta (herramientas de trabajo): padding cards 16–20. Densidad normal: 24.
- Radios: definir la "personalidad de esquina" — angular (0–4px, técnico/serio), media (8–12px, estándar), redonda (16px+, amigable). Coherente en TODO el producto.
- Sombras: 3 niveles derivados del matiz del texto (nunca negro puro). Productos sobrios: preferir bordes.

## Paso 5 — Escribir `design/tokens.md`

Usar la misma estructura de 6 secciones definida en SKILL.md, incluyendo los bloques de CSS variables y `tailwind.config`. Documentar en 1 línea el *porqué* de cada decisión principal (ej: "acento índigo: técnico sin ser frío; el público son desarrolladores").

## Anti-patrones (rechazar aunque parezcan más rápidos)

- Grises puros de Tailwind (`gray-50`, `slate-100`) como neutros → siempre teñir del acento.
- `Inter` + azul `#3B82F6` + esquinas `rounded-lg` → es el uniforme de las apps hechas con IA; esta combinación exacta está prohibida salvo pedido explícito.
- Degradados multicolor en botones o texto.
- Más de un acento primario "porque el cliente quería los dos colores" → uno manda, el otro se vuelve secundario con rol definido.
