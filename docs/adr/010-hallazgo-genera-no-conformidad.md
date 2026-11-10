# ADR-010 — Un hallazgo de no conformidad genera una NC con un clic

## Contexto
ISO 9.2/10.2: los hallazgos de auditoría que son no conformidades deben tratarse por el ciclo CAPA.
El Módulo 1 (No Conformidades) ya está en producción con `report_nonconformity(source=…)`. Falta
decidir cómo conectar un hallazgo de auditoría con una NC: ¿se crea la NC automáticamente al
registrar el hallazgo, o lo hace una persona explícitamente?

## Decisión
El hallazgo de tipo `no_conformidad` **no** crea la NC automáticamente. Un gestor (Líder SIG o el
auditor del equipo) la genera **con un clic** mediante `generate_nc_from_finding(finding)`, que:
reutiliza `report_nonconformity` con `source='auditoria_interna'`, el proceso y la severidad del
hallazgo; guarda el enlace en `audit_findings.nonconformity_id`; y **verifica que el hallazgo no
tenga ya una NC** (idempotente, no duplica). El enlace es unidireccional (hallazgo → NC); la NC no
cambia su esquema (solo su `source` ya contempla `auditoria_interna`).

## Consecuencias
- La persona decide cuándo convertir un hallazgo en NC (evita NC prematuras o duplicadas durante la
  auditoría).
- Reutiliza todo el ciclo CAPA ya auditado (numeración, tareas, verificación de eficacia).
- La trazabilidad hallazgo↔NC queda registrada; un reporte futuro puede recorrer ambos lados.
