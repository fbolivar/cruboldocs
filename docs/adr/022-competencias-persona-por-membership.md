# ADR-022 — La competencia de la persona se cuelga de `membership`, no de `profile`

## Contexto
Una persona (`profile`) puede pertenecer a varias organizaciones (`memberships`), con cargos distintos en
cada una. La competencia es relativa al cargo y a la organización, y es dato personal sensible que debe
quedar aislado por `organization_id`. También cambia el cargo de una persona con el tiempo.

## Decisión
`training_attendees` y `competency_assessments` referencian **`membership_id`** (la persona-en-la-org), no
`profile.id`. La evaluación guarda además el **`position_id` de contexto** (el cargo frente al que se
evaluó). "La persona ve su ficha" se resuelve mapeando el usuario actual a su `membership` en la
organización activa.

## Consecuencias
- Aislamiento multi-tenant natural: una persona en dos organizaciones tiene dos fichas separadas, sin fuga.
- Un **cambio de cargo** no reescribe el historial: la evaluación conserva el cargo contra el que se hizo.
- Si se revoca una membresía, su historial de competencia permanece (evidencia), ligado a esa membresía;
  el borrado en cascada de la organización sí lo elimina (dato personal, Ley 1581).
- Contrapartida: para comparar a una persona entre organizaciones habría que cruzar por `profile`, algo que
  el MVP no necesita (cada organización es un silo).
