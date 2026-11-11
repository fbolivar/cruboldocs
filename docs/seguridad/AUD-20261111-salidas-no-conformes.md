# Auditoría de seguridad — Salida no conforme (v1.3-5a)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** módulo Salida no conforme (ISO 9001 8.7).
**Migración:** `supabase/migrations/045_salidas_no_conformes.sql` · **Capa de datos:** `queries.ts` (getNcOutputsSummary/listNcOutputs/getNcOutput) + `actions.ts` (createNcOutput/updateNcOutput/setOutputDisposition/closeOutput/cancelOutput/generateNcFromNcOutput/exportNcOutputsCsv) · **UI:** `src/components/salidas-no-conformes/*`, `src/app/app/salidas-no-conformes/**`.

## Resumen ejecutivo
Registro propio `nonconforming_outputs` (`SNC-AAAA-###`) con disposición y máquina de estados; genera NC reutilizando `report_nonconformity(source='producto_servicio')`. Espejo de los módulos APTO: RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (`search_path=''`) con autorización por rol. Se resolvió una **colisión de nombre** (había `generate_nc_from_output` de Revisión por la dirección): la función y la action nuevas se llaman `generate_nc_from_snc`/`generateNcFromNcOutput`, sin tocar lo existente. Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado | Cerrar exige disposición | `close_output` rechaza si `disposition` es null ("Aplica una disposición"); estados validados en el servidor. Prueba RLS. | OK |
| 2 | Verificado (control clave) | `generate_nc_from_snc` sin cruce de org, idempotente | La NC se crea con el `organization_id` **de la salida**, autoriza por `can_manage_nc_outputs(org, proceso)`, `for update` + guard `nonconformity_id`; segunda llamada rechazada; fuente `producto_servicio`. Prueba RLS. | OK |
| 3 | Verificado | Colisión de nombre resuelta sin daño | La función existente `generate_nc_from_output(uuid)` (Revisión, 023) quedó intacta; el intento de clobber falló y se renombró lo nuevo a `generate_nc_from_snc`. | OK |
| 4 | Verificado | Autorización por rol en toda mutación | Crear/editar/disposición/cerrar/anular/generar = Líder SIG o Líder del proceso; consulta y otra org rechazadas. FKs compuestas `(id, organization_id)` a processes/positions/nonconformities. Pruebas RLS. | OK |
| 5 | Verificado | Validación de entrada | Zod (enum de disposición, uuids, fecha, cotas); la BD revalida la disposición; CSV por `toCsv`; `dbMessage` evita fuga. Disposición inválida rechazada. | OK |
| 6 | Info | Numeración y deny-all | `SNC-AAAA-###` atómico (`snc_counters` deny-all, en `rls_enabled_no_policy`=20); RPCs authenticated-only (anon sigue en 2); `search_path` = 0. | Aceptado |

## Checklist
- [x] RLS activo + política por organización; contador deny-all
- [x] Escritura por RPC definer con autz por rol; cerrar exige disposición
- [x] generate_nc_from_snc sin cruce de org, idempotente — probado
- [x] Sin colisión con la función de Revisión (nombre propio)
- [x] Aislamiento 2 orgs probado
- [x] tsc + lint + 559 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, search_path 0)
