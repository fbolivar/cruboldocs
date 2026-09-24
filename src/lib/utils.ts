import { createCn } from "cn/config"

// Escala tipográfica de design/tokens.md: se registra como font-size para que
// `text-small text-texto-sec` no se interprete como dos colores en conflicto.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["h1", "h1-movil", "h2", "h3", "kpi", "body", "body-lg", "small", "label", "caption"] },
      ],
    },
  },
})
