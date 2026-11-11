# Design Spec — Tomar el curso (`/app/capacitacion/[codigo]/tomar`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/pwa-lms/ARQUITECTURA.md (4b) + ADR-059.

## 1. Propósito y protagonista
- **Qué logra:** **tomar** un curso publicado (leer el material, responder la evaluación) y obtener el **resultado + constancia**.
- **Protagonista:** el **cuerpo de la evaluación** (las preguntas a responder).
- **Roles:** cualquier **miembro activo**; la inscripción guarda `user_id`, el puntaje y el resultado.

## 2. Wireframe (escritorio)
```
‹ Capacitación   Inducción en SST

MATERIAL
┌──────────────────────────────────────────────┐
│ (texto del curso o enlace)                     │
└──────────────────────────────────────────────┘

EVALUACIÓN
┌──────────────────────────────────────────────┐
│ 1. ¿Qué es un EPP? *                           │
│    ( ) Elemento de Protección Personal         │
│    ( ) Equipo de Primeros Pasos                │
│ 2. … *                                         │
│                                                │
│                               [ Enviar evaluación ]
└──────────────────────────────────────────────┘
```
Resultado (tras enviar):
```
■ Aprobado — 88%                     (o ■ No aprobado — 60%, umbral 70%)
Constancia: CAP-2026-003 · Ana Ruiz · 2026-11-10 · 88%   [ Tomar de nuevo ] [ Volver ]
```

## 3. Secciones y comportamiento
- **Material:** el contenido del curso (texto/markdown o enlace), para repasar antes de la evaluación.
- **Evaluación:** cada pregunta con sus opciones como **radiogroup** (respuesta única); **las opciones NO traen marca de correcta** (el servidor califica). "Enviar evaluación" exige **todas respondidas**; al enviar, el **servidor califica** (puntaje 0–100) y fija el resultado (**aprobado** si ≥ umbral).
- **Resultado:** pantalla con **badge aprobado/no aprobado**, **puntaje**, umbral, y la **constancia en pantalla** (código del curso, nombre de la persona, fecha, puntaje). **"Tomar de nuevo"** (nuevo intento) y **"Volver al curso"**. Sin generación de PDF en v1.

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton del material + evaluación. |
| Curso no publicado / inexistente | Mensaje neutro: "Este curso no está disponible para tomarse." |
| Validación | Si falta responder una pregunta, error inline y enfoca la primera sin responder. |
| Resultado aprobado | Badge `exito` + constancia + "Tomar de nuevo" / "Volver". |
| Resultado no aprobado | Badge `error` + puntaje y umbral + "Tomar de nuevo". |
| Error de red | Mensaje + reintentar; conserva lo capturado. |

## 5. Accesibilidad
- Cada pregunta es un `radiogroup` con `aria-required` y `aria-checked`; errores asociados con `aria-describedby`; el puntaje y el resultado se anuncian y no dependen solo del color.

## 6. Móvil (≤640px)
- Una columna; material colapsable; opciones táctiles grandes; "Enviar evaluación" fijo al pie del flujo; constancia a ancho completo.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Badge, Button, Label, EmptyState | Reutilizados | |
| **CourseTaker** | Nuevo | material + preguntas (radiogroups) + enviar |
| **CourseResult** + **Certificate** | Nuevo | resultado + constancia en pantalla |

## 8. Decisiones y porqués
- **Calificación server-side, sin la respuesta correcta en el cliente** (ADR-059): la integridad y la nota no se confían del navegador.
- **Constancia en pantalla:** cumple el MVP como evidencia; el PDF se difiere.
- **Reintento permitido:** la capacitación busca el aprendizaje; se guarda el último intento.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
