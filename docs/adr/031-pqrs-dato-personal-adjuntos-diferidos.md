# ADR-031 — Dato personal del cliente (Ley 1581) y adjuntos diferidos

## Contexto
La PQRS guarda **dato personal del cliente** (nombre y un contacto) para poder responder. También podrían
adjuntarse soportes (correos, documentos) en Storage. Más datos y más archivos = más superficie de
privacidad y de auditoría.

## Decisión
**Minimización:** solo `customer_name` y `customer_contact` (un canal de contacto), ambos opcionales; no se
piden identificación, dirección ni más. RLS estricto por `organization_id` (solo roles del SIG ven las
PQRS). **Adjuntos en Storage diferidos:** sin bucket ni columnas de archivo en v1; si se añaden, será con el
patrón endurecido server-only (bucket privado + lectura por RLS + registro con actor explícito) y su propia
auditoría. El borrado de la organización elimina en cascada los datos personales del cliente.

## Consecuencias
- Reduce el riesgo de privacidad y mantiene corta la auditoría del módulo.
- Si una organización necesita más campos del cliente o soportes, es una ampliación que se audita aparte.
- La divulgación de tratamiento (si el cliente final fuera titular ante CrubolDocs) se evalúa con el abogado
  antes de ampliar; en v1 el responsable del dato es la organización cliente, no CrubolDocs.
