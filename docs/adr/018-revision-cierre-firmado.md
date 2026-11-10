# ADR-018 — Cierre del acta firmado con el patrón ADR-004, en campos propios

## Contexto
El acta de revisión debe quedar como **evidencia formal e inmutable**, firmada por quien representa a la
dirección. El proyecto ya tiene firma electrónica simple (ADR-004): reautenticación reciente +
registro de hash + IP + user agent, en la tabla `signatures`. Pero esa tabla está acoplada a
`document_versions` (FK a la versión, `unique(version_id, action)`), pensada para firmas de documento.

## Decisión
El cierre del acta (`close_review`) firma con el **mismo patrón ADR-004** (exige `reauth_at` reciente,
registra `approval_hash`, `ip`, `user_agent`, `approved_by`, `approved_at`) pero en **campos propios de
`management_reviews`**, sin reutilizar la tabla `signatures`. Tras cerrar, el acta es **inmutable** (no
se editan entradas ni salidas). En el MVP firma el **Líder SIG** (representante de la dirección); una
firma adicional de la alta dirección (gerente) queda para una iteración futura. La IP de la firma se
expone solo a quien administra/audita (como en las firmas de documento).

## Consecuencias
- Se conserva la garantía de no repudio (reauth + hash + IP) sin forzar el modelo de `signatures`.
- El acta cerrada no cambia: lo que se firmó es lo que queda.
- Si más adelante se quiere una segunda firma, se añaden campos/relación sin tocar lo existente.
