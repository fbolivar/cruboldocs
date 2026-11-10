# ADR-019 — Módulo Competencias: escritura por RPC y visibilidad por alcance

## Contexto
ISO 7.2 exige registrar competencias requeridas, formación y evidencia de personas — datos personales de
desempeño más sensibles que el resto del SGC (Ley 1581). El proyecto tiene un patrón auditado APTO en los
módulos 1–4: RLS solo-SELECT por `organization_id` y escritura por funciones `SECURITY DEFINER` con
autorización interna por rol.

## Decisión
Las tablas nuevas (`competencies`, `position_competencies`, `trainings`, `training_attendees`,
`competency_assessments`) tienen **RLS solo-SELECT** y toda escritura pasa por RPCs `SECURITY DEFINER`
(`search_path=''`, `grant authenticated`, `log_event` en cada mutación). **Gestión = Líder SIG**; el
**Líder de proceso** gestiona las de su proceso (por el `process_id` del cargo de la persona). La
**visibilidad** es más fina que en otros módulos por el dato personal: los catálogos y perfiles de cargo
los ven los roles del SIG; los registros de formación y las evaluaciones de **una persona** los ven el
Líder SIG, el Líder del proceso del cargo y **la propia persona** (su ficha). FKs compuestas
`(id, organization_id)`; certificados en Storage privado con lectura por RLS.

## Consecuencias
- Mismo modelo de seguridad ya auditado → auditoría más corta (espejo), pero con **pruebas de aislamiento
  adicionales entre personas de la misma organización**, no solo entre organizaciones.
- Nada se escribe por REST directo; todo pasa por funciones con chequeo de rol y alcance.
- La regla "la persona ve lo suyo" exige resolver en servidor el `membership` del usuario actual.
