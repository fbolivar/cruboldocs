# Arquitectura — Módulo Auditorías Internas

> Módulo 2 del roadmap (`docs/ROADMAP.md`). ISO 9001 cap. 9.2. **Alimenta al Módulo 1** (No
> Conformidades/CAPA, ya en producción): un hallazgo de tipo "no conformidad" genera una NC.
> Stack fijo; reutiliza cargos/roles, numeración atómica, auditoría (log_event), y el patrón RLS
> solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de riesgos/no conformidades).

## 1. Negocio

- **Problema:** la organización debe auditar internamente su SGC (ISO 9.2) para verificar que
  cumple los requisitos y encontrar desviaciones. Hoy CrubolDocs no permite planificar auditorías,
  conducirlas ni registrar hallazgos; sin eso no cierra el ciclo de evaluación del desempeño que el
  auditor externo exige.
- **Acción de valor:** planificar una auditoría → ejecutarla registrando hallazgos → cerrarla; y
  que un hallazgo de **no conformidad** se convierta en una **NC** con un clic (cierra el lazo
  auditoría → mejora).
- **Cobro:** sin cambios (v1 sin cobro).

## 2. Modelo de dominio (nuevas entidades)

Multi-tenant ya existe. Patrón del proyecto: FKs compuestas `(id, organization_id)`; escrituras solo
por funciones `SECURITY DEFINER`.

### `audits`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| code | text not null | `AUD-AAAA-###`; `unique(organization_id, code)` |
| title | text not null | p. ej. "Auditoría interna SGC 2026-1" |
| objective | text null | objetivo/alcance general |
| criteria | text null | criterios (ISO 9001, procedimientos, normograma) |
| lead_auditor_position_id | uuid null → positions(id, org) | cargo con rol `auditor` que lidera |
| planned_date | date not null | fecha planificada |
| status | text not null default `planificada` | `planificada`→`en_ejecucion`→`cerrada` (+ `cancelada`) |
| conclusions | text null | conclusiones del informe (al cerrar) |
| closed_at / cancel_reason | | |
| created_by / created_at / updated_at | | |

### `audit_processes` (procesos cubiertos; una auditoría cubre varios)
`(audit_id, organization_id)` + `(process_id, organization_id)`, `unique(audit_id, process_id)`.

### `audit_findings`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| audit_id | uuid not null → audits(id, org) | |
| type | text not null | `no_conformidad` \| `observacion` \| `oportunidad_mejora` \| `conformidad` |
| process_id | uuid null → processes(id, org) | proceso del hallazgo |
| description | text not null | qué se encontró |
| criteria_ref | text null | requisito/cláusula (p. ej. "7.5.3") |
| severity | text null | para `no_conformidad`: `menor` \| `mayor` |
| nonconformity_id | uuid null → nonconformities(id, org) | NC generada desde el hallazgo (enlace) |
| created_by / created_at | | |

### `audit_counters` — numeración atómica `AUD-AAAA-###` por organización/año (igual que `nc_counters`).

**Datos sensibles:** hallazgos pueden citar incidentes/personas → RLS estricta + auditoría de las
mutaciones.

## 3. Estados y transiciones

```
planificada ──start_audit──▶ en_ejecucion ──close_audit(conclusiones)──▶ cerrada
     │                            │                                         
     └──────── cancel_audit ──────┴──▶ cancelada (con motivo)
```

- **planificada:** creada por el Líder SIG (fecha, procesos, criterios, líder auditor).
- **en_ejecucion:** el equipo auditor registra hallazgos.
- **cerrada:** se registran conclusiones; no se agregan más hallazgos.
- Un **hallazgo `no_conformidad`** puede **generar una NC** (un clic) en cualquier momento tras
  registrarse; queda enlazado (`nonconformity_id`).

## 4. Rutas y RLS

### Rutas (fase frontend)
| Ruta | Muestra | Rol |
|---|---|---|
| `/app/auditorias` | Lista de auditorías (estado, fecha, procesos, nº de hallazgos) | `can_see_audits` |
| `/app/auditorias/[codigo]` | Ficha: datos, procesos, criterios, líder, hallazgos (con badges de tipo), botón "Generar NC" por hallazgo, conclusiones | `can_see_audits` |
| "Planificar auditoría" (Sheet) | Líder SIG | |
| "Registrar hallazgo" (Sheet, en `en_ejecucion`) | rol `auditor` o Líder SIG | |

### Autorización (helpers SQL, espejo de No Conformidades)
- `can_see_audits(org)` = roles del SIG (`lider_sig`, `lider_proceso`, `responsable_control`,
  `auditor`, `consulta`).
- `can_manage_audits(org)` = `lider_sig` (planifica, cierra, cancela).
- Registrar hallazgo: `has_role(org,'auditor')` o `can_manage_audits` (y la auditoría en `en_ejecucion`).

### Políticas
- `audits`, `audit_processes`, `audit_findings`: **RLS on**, solo **SELECT** con `can_see_audits`.
  Sin escritura por REST. `audit_counters`: RLS on, sin políticas (deny-all).

### Funciones `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event` en cada una)
| Función | Quién | Efecto |
|---|---|---|
| `plan_audit(org, title, objective, criteria, lead_auditor, planned_date, process_ids[])` | `can_manage_audits` | crea auditoría `planificada`, asigna `code`, inserta procesos |
| `start_audit(audit)` | `can_manage_audits` | `planificada`→`en_ejecucion` |
| `add_audit_finding(audit, type, process, description, criteria_ref, severity)` | `auditor` o `can_manage_audits` | agrega hallazgo (solo en `en_ejecucion`) |
| `generate_nc_from_finding(finding)` | `auditor` del equipo o `can_manage_audits` | si el hallazgo es `no_conformidad` y no tiene NC, llama a `report_nonconformity(source='auditoria_interna', …)` y enlaza |
| `close_audit(audit, conclusions)` | `can_manage_audits` | `en_ejecucion`→`cerrada` con conclusiones |
| `cancel_audit(audit, reason)` | `can_manage_audits` | →`cancelada` |

## 5. Integraciones y riesgos

**Integra con lo existente:**
- **No Conformidades (Módulo 1):** `generate_nc_from_finding` reutiliza `report_nonconformity`
  (ya en producción) con `source='auditoria_interna'`; el enlace vive en `audit_findings.nonconformity_id`.
- **Tareas (opcional):** al planificar, una tarea `conducir_auditoria` para el líder auditor
  (nueva `TaskType`, categoría `mejora`); el cron marca vencidas. (Puede ir en el MVP o diferirse.)
- **Auditoría (log_event)** y **numeración (`audit_counters`)** reutilizados.

**Top 3 riesgos técnicos y mitigación:**
1. **Numeración concurrente** → tabla `audit_counters` con upsert atómico (patrón `nc_counters`).
2. **Fuga entre tenants / permisos** → RLS solo-SELECT + escritura por RPC con chequeo; FKs
   compuestas; pruebas RLS nuevas. Espejo de No Conformidades (ya auditado APTO).
3. **Doble NC desde un hallazgo** → `generate_nc_from_finding` verifica que `nonconformity_id` esté
   vacío antes de crear; idempotente.

## 6. Plan de migración y fases
- Migración `020_auditorias.sql`: tablas + índices que cubren FKs + RLS + helpers + RPCs + contadores.
- Tipos de vista + (opcional) `TaskType` `conducir_auditoria`.
- Pruebas RLS (aislamiento, planificar/cerrar por rol, registrar hallazgo solo en ejecución,
  generar NC enlazada e idempotente).
- Fases siguientes: diseño → frontend → backend → seguridad → testing → deploy.

## 7. ADRs
- **ADR-009** — Módulo Auditorías: escritura por RPC `SECURITY DEFINER`, visibilidad espejo del SIG,
  numeración `AUD-AAAA-###` con contador atómico.
- **ADR-010** — Un hallazgo `no_conformidad` genera una NC **con un clic** (no automático), enlazada
  y sin duplicar.

---

## Propuesta de alcance (MVP) — PENDIENTE DE APROBACIÓN

**Entra en v1:** planificar auditoría (procesos, criterios, líder auditor, fecha) → ejecutarla
registrando hallazgos (4 tipos) → generar NC desde un hallazgo de no conformidad → cerrar con
conclusiones. Lista de auditorías + ficha. Numeración `AUD-AAAA-###`.

**Fuera del MVP (siguientes iteraciones):** programa anual como entidad propia; lista de
verificación/checklist de requisitos; equipo auditor múltiple (varios auditores por auditoría);
adjuntar archivos a hallazgos (la evidencia vive en la NC generada); informe PDF exportable.

### Decisiones que necesito de ti (para fijar el alcance)
1. **Programa anual:** en el MVP cada auditoría se planifica suelta (con objetivo/fecha); el
   "programa anual" como entidad viene después. ¿De acuerdo? (recomiendo sí).
2. **Varios procesos por auditoría** (junction `audit_processes`) → recomiendo sí.
3. **Tipos de hallazgo:** no conformidad (menor/mayor), observación, oportunidad de mejora,
   conformidad → recomiendo esos cuatro.
4. **Hallazgo → NC:** el hallazgo de no conformidad genera la NC **con un clic** (no automático),
   enlazada → recomiendo así.
5. **Permisos:** planifica/cierra **Líder SIG**; registra hallazgos el rol **auditor** (o el líder) →
   recomiendo así.
6. **Líder auditor único** en el MVP (equipo múltiple después) → recomiendo sí.
7. **Tarea "conducir auditoría"** para el líder auditor al planificar: ¿la incluyo en el MVP o la
   difiero? (recomiendo incluirla; es barata y reutiliza tareas+cron).
