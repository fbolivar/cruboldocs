# Design Spec — Encuesta de satisfacción enviable (`/encuesta/[token]` + panel)

**Producto:** CrubolDocs · **Fecha:** 2026-11-10 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/encuesta/ARQUITECTURA.md + ADR-038/039/040.

## 1. Propósito y protagonista

- **Página pública:** el cliente responde en segundos; protagonista = la **pregunta de puntaje**.
- **Panel (gestión):** el Líder SIG crea una campaña, comparte el link y ve el **avance en vivo**; protagonista = el **link + nº de respuestas/promedio**.

## 2. Página pública `/encuesta/[token]` (sin sesión, sin shell)

Página limpia centrada (como `/invitacion`), con el logo de CrubolDocs, **sin menú ni topbar**, mobile-first.

```
            ◆ CrubolDocs
   ┌───────────────────────────────┐
   │  <Título de la campaña>        │
   │  Tu opinión nos ayuda a mejorar.│
   │                                │
   │  ¿Qué tan satisfecho estás?    │
   │  [ 0 ─────●──────── 100 ]  84  │   (escala según campaña)
   │  (o 1–5 estrellas · o NPS 0–10)│
   │                                │
   │  Comentario (opcional)         │
   │  [ textarea ]                  │
   │  No incluyas datos personales. │
   │                                │
   │  [ ✓ CAPTCHA Turnstile ]       │
   │  [        Enviar         ]     │
   └───────────────────────────────┘
```

- **Control de puntaje según `scale`:** `0_100` = slider 0–100 con el valor visible; `1_5` = 5 estrellas/botones; `nps_0_10` = botones 0–10. Siempre con el **valor** mostrado (nunca color solo).
- **Comentario**: textarea opcional, máx. 1000, con aviso "No incluyas datos personales".
- **CAPTCHA Turnstile** (invisible/visible según config) + botón **Enviar** (deshabilitado hasta tener puntaje y token de CAPTCHA).
- Al enviar: server action → rate-limit IP + verificación Turnstile → RPC `submit_survey_response`. Éxito → pantalla **"¡Gracias!"** ("Registramos tu respuesta."). No se permite re-enviar en la misma vista (botón pasa a estado enviado).

### Estados (página pública)
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del cuerpo de la tarjeta. |
| Token inválido / campaña cerrada | Mensaje **neutro**: "Esta encuesta no está disponible." (sin revelar organización ni si existió). Sin formulario. |
| Error de envío | Mensaje humano + reintentar; conserva puntaje y comentario. CAPTCHA fallido → "Completa la verificación de seguridad." |
| Éxito | Pantalla "¡Gracias!" + nota de privacidad (anónima). |

## 3. Panel de satisfacción (extensión de `/app/pqrs`)

Se añade, dentro del **panel de satisfacción** ya existente, una subsección **"Campañas de encuesta"**:

```
SATISFACCIÓN DEL CLIENTE (9.1.2)        [+ Registrar satisfacción] [+ Nueva encuesta]
Campañas de encuesta
┌───────────────────────────────────────────────────────────────┐
│ ENC-2026-003 · CSAT · nov 2026 · ■ Abierta                     │
│ 32 respuestas · promedio 84 ● Bien      [ Copiar link ] [Cerrar]│
├───────────────────────────────────────────────────────────────┤
│ ENC-2026-002 · NPS · oct 2026 · ■ Cerrada · 28 resp · 71       │
└───────────────────────────────────────────────────────────────┘
(y debajo, la lista de mediciones de satisfacción que ya existe)
```

- **"Nueva encuesta"** (Sheet, si gestiona): título, método (encuesta/NPS/CSAT), escala (0–100 / 1–5 / NPS 0–10), periodo (mes), proceso (opcional). Al crear → genera `ENC-AAAA-###` + token; muestra el **link** con botón **"Copiar link"**.
- **Fila de campaña:** código · método · periodo · estado; **nº de respuestas + promedio en vivo** (gauge/semáforo); **"Copiar link"** (abierta) y **"Cerrar"** (abierta → confirma: "Se registrará el promedio como la medición de <periodo>; la campaña queda cerrada"). Exportar comentarios/puntajes a **CSV** por campaña.
- **Cerrar** sin respuestas: botón deshabilitado con tooltip "Aún no hay respuestas".

### Estados (panel)
| Estado | Comportamiento |
|---|---|
| Vacío | "Aún no tienes campañas de encuesta" + "Crea una con «Nueva encuesta»" (si gestiona). |
| Carga / Error | Skeleton de filas / `SectionError` por la subsección (degrada solo esa parte). |
| Éxito | Toast al crear/cerrar/copiar; `router.refresh()`. |

## 4. Comportamiento móvil (≤640px)

- Pública: tarjeta a ancho completo con gutter de 16px; slider/estrellas/botones a ancho completo; Enviar fijo al pie del flujo.
- Panel: cada campaña es una card; acciones (Copiar/Cerrar) apiladas a ancho completo; Sheet a pantalla completa.

## 5. Accesibilidad

- Control de puntaje operable por teclado (slider con flechas; estrellas/botones como `radiogroup` con `aria-checked`); el valor numérico siempre visible (no color solo).
- Campos con `label`; foco visible; la página pública tiene `<h1>` con el título de la campaña; mensajes de error asociados al campo.
- Contraste AA; el aviso de privacidad es texto, no solo ícono.

## 6. Componentes

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| Card, Button, Textarea, EmptyState, SectionError, Sheet, Select, Badge | Reutilizados | |
| Turnstile | Reutilizado | mismo widget del login |
| SatisfactionGauge | Reutilizado | promedio en vivo de la campaña |
| **ScoreInput** | Nuevo | puntaje según escala (slider 0–100 / estrellas 1–5 / botones NPS 0–10), accesible, valor visible |
| **SurveyForm** | Nuevo | formulario público (ScoreInput + comentario + Turnstile + enviar + gracias) |
| **SurveyCampaigns** + **NewSurveySheet** + **CloseSurveyButton** + **CopyLinkButton** | Nuevo | subsección del panel de satisfacción |

## 7. Decisiones y porqués

- **Página pública sin shell** (como invitación): el cliente no es usuario; mínima fricción, sin navegación.
- **Mensaje neutro** para token inválido/cerrado: no se filtra organización ni existencia (anti-enumeración, ADR-039).
- **Anónima + aviso** en el comentario: minimización de dato personal (ADR-038).
- **Promedio en vivo informativo; el cierre fija la medición** (ADR-040): el dato oficial de 9.3 es el del cierre.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
