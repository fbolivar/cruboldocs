# Arquitectura — Módulo No Conformidades / CAPA

> Módulo 1 del roadmap a SGC completo (`docs/ROADMAP.md`). ISO 9001 cap. 10.2 (no conformidad y
> acción correctiva). Alcance MVP **aprobado por Fernando (2026-11-10)**. Stack fijo del proyecto;
> reutiliza cargos/roles, tareas+cron, evidencias/Storage, auditoría inmutable y correo (outbox).

## 1. Negocio

- **Problema:** una no conformidad (hallazgo de auditoría, queja, producto/servicio no conforme,
  riesgo materializado o idea de mejora) no se puede gestionar hoy en CrubolDocs. Sin tratarla,
  analizar su causa, actuar y verificar la eficacia, la organización **no cierra el ciclo de mejora
  que exige el auditor externo** para certificar ISO 9001.
- **Acción de valor:** registrar una NC → analizar causa → plan de acciones con responsable/plazo →
  evidencia → verificar eficacia → cerrar, con trazabilidad y tareas, como el resto de la app.
- **Cobro:** sin cambios (v1 sin cobro, ADR-005). El módulo entra para todas las organizaciones.

## 2. Modelo de dominio (nuevas entidades)

Multi-tenant ya existe (`organizations`/`profiles`/`memberships`/`positions`/`position_roles`).
Patrón del proyecto: FKs compuestas `(id, organization_id)` para integridad de tenant; escrituras
solo por funciones `SECURITY DEFINER` (sin políticas de INSERT/UPDATE/DELETE por REST), igual que
`risks`/`documents`.

### `nonconformities`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null → organizations | |
| code | text not null | `NC-AAAA-###`; `unique(organization_id, code)` |
| source | text not null | `auditoria_interna`\|`auditoria_externa`\|`queja_pqrs`\|`producto_servicio`\|`riesgo_materializado`\|`mejora`\|`otro` |
| process_id | uuid null → processes(id, organization_id) | proceso afectado |
| title | text not null | |
| description | text not null | qué pasó |
| severity | text not null | `observacion`\|`menor`\|`mayor` |
| source_risk_id | uuid null → risks(id, organization_id) | si `source=riesgo_materializado` |
| reported_by | uuid not null → profiles | quién la reportó |
| detected_at | date not null | |
| owner_position_id | uuid null → positions(id, organization_id) | cargo responsable del tratamiento |
| root_cause | text null | análisis de causa (texto libre en MVP) |
| root_cause_method | text null | reservado (5 porqués/Ishikawa, futuro) |
| status | text not null default `abierta` | ver §estados |
| reopened_count | int not null default 0 | veces que la verificación falló |
| verified_by | uuid null → profiles | |
| verified_at | timestamptz null | |
| effective | boolean null | resultado de la verificación |
| verification_notes | text null | |
| closed_at | timestamptz null | |
| cancel_reason | text null | si `status=anulada` |
| created_by | uuid not null | |
| created_at / updated_at | timestamptz | |

### `nc_actions` (plan de acción)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| nonconformity_id | uuid not null → nonconformities(id, organization_id) | |
| type | text not null | `correccion` (inmediata) \| `correctiva` \| `preventiva` |
| description | text not null | |
| responsible_position_id | uuid not null → positions(id, organization_id) | |
| due_date | date not null | |
| status | text not null default `pendiente` | `pendiente`\|`en_curso`\|`hecha`\|`cancelada` |
| completed_at | timestamptz null | |
| completed_by | uuid null → profiles | |
| created_by | uuid not null | |
| created_at | timestamptz | |

### `nc_evidences` (evidencia de acción o de la NC)
Espejo de `control_evidences` (Storage privado + hash). `(nonconformity_id, organization_id)`,
`action_id uuid null` (evidencia de una acción concreta o general de la NC), `file_path`,
`file_sha256`, `file_size`, `note`, `registered_by`, `registered_at`.

### `nc_counters` (numeración atómica)
`(organization_id, year) pk`, `last_seq int`. Se incrementa dentro de `report_nonconformity`
(patrón de `ai_agent_usage`) para generar `NC-AAAA-###` sin colisiones.

**Datos sensibles:** una NC puede describir incidentes y personas → RLS estricta + auditoría de
todas las mutaciones (como riesgos).

## 3. Estados y transiciones

```
abierta ──set_nc_cause──▶ analisis_causa ──▶ plan_accion ──(add/▶ejecución acciones)──▶ en_ejecucion
   │                                                                                        │
   │                                                              (todas las acciones hechas)│
   ▼                                                                                        ▼
anulada ◀──cancel_nc (con motivo)                                                      verificacion
                                                                                           │
                                                   verify_nc(effective=true)  ┌────────────┴────────────┐
                                                               ▼              │   verify_nc(false)      │
                                                            cerrada           ▼ reopened_count++        │
                                                                          plan_accion ◀─────────────────┘  (= "Reabierta")
```

- **abierta:** creada por el reporte; aún sin dueño/causa obligatorios.
- **analisis_causa → plan_accion:** el gestor registra causa y empieza a agregar acciones.
- **en_ejecucion:** hay acciones con responsables trabajando; al completarse todas pasa a
  **verificacion**.
- **verificacion:** el verificador decide eficacia. Si es eficaz → **cerrada**; si no → vuelve a
  **plan_accion** (incrementa `reopened_count`; esto es "Reabierta").
- **anulada:** cierre sin tratamiento, con motivo (p. ej. duplicada o no procede).
- **Verificación de eficacia obligatoria:** no se puede pasar a `cerrada` sin `verify_nc`.

Quién puede cada transición → §RLS.

## 4. Rutas y RLS

### Rutas (fase frontend)
| Ruta | Muestra | Rol |
|---|---|---|
| `/app/no-conformidades` | Tablero/lista con filtros (estado, proceso, origen, severidad) | `can_see_nonconformities` |
| `/app/no-conformidades/[id]` | Ficha: datos, causa, acciones, evidencias, verificación, timeline | `can_see_nonconformities` |
| Acción "Reportar no conformidad" (botón global en `/app`) | Formulario mínimo | cualquier miembro activo |
| Inicio (`/app`) | Tarjeta "No conformidades abiertas" + acciones vencidas en la bandeja | según rol |

### Autorización (nuevos helpers SQL, espejo de riesgos)
- `can_see_nonconformities(org)` = roles del SIG (mismos que `can_see_risks`: `lider_sig`,
  `lider_proceso`, `responsable_control`, `auditor`, `consulta`) **o** ser quien la reportó
  (`reported_by = auth.uid()`) **o** responsable de alguna acción.
- `can_manage_nc(org, process)` = `lider_sig(org)` **o** `lider_proceso(org, process)` (espejo de
  `can_manage_risk`).

### Políticas
- `nonconformities`, `nc_actions`, `nc_evidences`: **RLS on**, solo política **SELECT** con
  `can_see_nonconformities(organization_id)`. **Sin** políticas de escritura: todo pasa por RPCs.
- `nc_counters`: RLS on, sin políticas (solo la función `SECURITY DEFINER` la toca).

### Funciones `SECURITY DEFINER` (escritura; `search_path=''`, `grant execute to authenticated`, cada una llama a `log_event`)
| Función | Quién | Efecto |
|---|---|---|
| `report_nonconformity(org, source, process, title, description, severity, detected_at, source_risk?)` | cualquier miembro activo (`is_active_member`) | crea NC en `abierta`, asigna `code` vía `nc_counters`, audita, notifica a Líder SIG |
| `set_nc_cause(nc, cause, owner_position)` | `can_manage_nc` | fija causa y dueño; `abierta`→`analisis_causa`/`plan_accion` |
| `add_nc_action(nc, type, description, responsible_position, due_date)` | `can_manage_nc` | agrega acción; crea **tarea** para el responsable; `plan_accion`→`en_ejecucion` |
| `complete_nc_action(action)` | responsable de la acción o `can_manage_nc` | marca `hecha`; si todas hechas → `en_ejecucion`→`verificacion` |
| `cancel_nc_action(action)` | `can_manage_nc` | marca `cancelada` |
| `verify_nc(nc, effective, notes)` | `lider_sig` o dueño de la NC | `verificacion`→`cerrada` (eficaz) o →`plan_accion` reabriendo |
| `cancel_nc(nc, reason)` | `can_manage_nc` | →`anulada` con motivo |
| `add_nc_evidence(nc, action?, path, sha256, size, note)` | responsable o `can_manage_nc` | registra evidencia (valida el archivo ya subido, como las evidencias de control) |

Storage: bucket privado existente; lectura por función `storage_can_read_*` análoga a documentos/
evidencias. La subida usa URL firmada `upsert:false` y luego la copia a ruta final (igual que la
corrección ALTA-01 del hardening de firmas).

## 5. Integraciones y riesgos

**Integra con lo existente:**
- **Tareas + cron:** `add_nc_action` crea una tarea `ejecutar_accion_nc` (nueva `TaskType`,
  categoría nueva `mejora`) para el cargo responsable; el cron diario (`run_daily_jobs`) marca las
  vencidas y recuerda, como con controles y revisiones.
- **Correo (outbox):** plantilla nueva `accion_nc` al asignar una acción; recordatorio de vencida
  por el cron.
- **Auditoría:** cada RPC llama `log_event` (no hay escritura por REST que evada la traza).
- **Riesgos:** `source=riesgo_materializado` enlaza `source_risk_id`; un control fallido puede
  derivar en NC (enlace opcional en MVP).
- **Documentos:** una acción suele ser "actualizar el documento X". En MVP la acción es texto; el
  enlace formal acción→documento se difiere (nota en la acción). (Decisión futura.)
- **Inicio:** `getHomeSummary` suma "No conformidades abiertas" y las acciones vencidas entran a la
  bandeja de tareas.

**Top 3 riesgos técnicos y mitigación:**
1. **Numeración concurrente** (dos reportes al tiempo) → tabla `nc_counters` con upsert atómico
   dentro de la función (patrón `ai_agent_usage`), no `max()+1` suelto.
2. **Fuga entre tenants / visibilidad de datos sensibles** → RLS solo-SELECT + escritura por RPC
   con chequeo de permiso; pruebas RLS nuevas (aislamiento, ver/gestionar, reportar sin ver) antes
   de pasar seguridad. Espejo del módulo de riesgos, ya auditado.
3. **Estados inconsistentes** (cerrar sin verificar, completar acción de otra NC) → la máquina de
   estados vive en las funciones (no en el cliente); transiciones validadas en SQL.

## 6. Plan de migración y fases

- **Migración `supabase/migrations/017_no_conformidades.sql`:** tablas (con índices que cubren las
  FKs para no repetir el aviso de FKs sin índice), RLS solo-SELECT, helpers `can_see_nonconformities`
  / `can_manage_nc`, RPCs de la §4, `nc_counters`, grants. Regenerar tipos.
- **Tipos de dominio:** extender `TaskType` (`ejecutar_accion_nc`) y `TaskCategory` (`mejora`);
  tipos de vista de NC en `src/lib/types.ts`.
- **Pruebas RLS (PGlite):** aislamiento por organización, `can_see`/`can_manage`, reporte por
  miembro sin rol SIG, verificación obligatoria, numeración.
- **Fases siguientes (una por sesión):** diseño (spec de tablero + ficha) → frontend → backend
  (acciones/consultas tipadas) → seguridad (auditoría del módulo) → testing.

## 7. ADRs

- **ADR-006** — Módulo No Conformidades: escritura por RPC `SECURITY DEFINER`, visibilidad espejo de
  riesgos, reporte abierto a cualquier miembro.
- **ADR-007** — Numeración `NC-AAAA-###` con contador atómico por organización/año.
- **ADR-008** — Verificación de eficacia obligatoria; la reapertura vuelve a `plan_accion` en vez de
  ser un estado terminal.

## Checklist de salida (fase arquitectura)
- [x] Multi-tenant definido (reutiliza org + membership + rol)
- [x] MVP cabe en pocas pantallas (lista + ficha + reportar)
- [x] Camino dorado descrito de punta a punta (reportar → causa → acciones → evidencia → verificar → cerrar)
- [x] Riesgos con mitigación
- [ ] **Fernando aprueba esta arquitectura antes de pasar a diseño**
