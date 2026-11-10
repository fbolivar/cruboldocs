# Arquitectura — Módulo Revisión por la dirección

> Módulo 4 del roadmap (`docs/ROADMAP.md`). ISO 9001 cap. 9.3 (management review). **Consolida** lo que
> ya está en producción (control documental, riesgos, No Conformidades/CAPA, Auditorías internas,
> Indicadores/KPIs) en un **acta periódica** que la alta dirección formaliza. Stack fijo; reutiliza
> cargos/roles, numeración atómica, auditoría (`log_event`), firma electrónica simple (ADR-004),
> tareas+cron/correo, y los resúmenes de los módulos 1–3. Esfuerzo S (barato porque solo consolida).

## 1. Negocio

- **Problema:** ISO 9.3 exige que la alta dirección revise el SGC a intervalos planificados, con
  **entradas** definidas (9.3.2) y **salidas** de decisiones/acciones (9.3.3), y deje **evidencia**
  (un acta). Hoy CrubolDocs tiene todos los insumos dispersos en sus módulos, pero no hay dónde
  consolidarlos ni un acta firmada; sin eso el auditor externo no ve cerrado el ciclo de evaluación.
- **Acción de valor:** crear un acta de un periodo → que **precargue automáticamente** el desempeño del
  SGC desde los módulos (NC, auditorías, indicadores, riesgos, documentos) + completar las entradas de
  texto → registrar **decisiones/compromisos** con responsable y plazo → **cerrar y firmar** el acta.
- **Cobro:** sin cambios (v1 sin cobro).

## 2. Modelo de dominio (nuevas entidades)

Multi-tenant ya existe. Patrón del proyecto: FKs compuestas `(id, organization_id)`; escrituras solo
por funciones `SECURITY DEFINER`.

### `management_reviews` (el acta)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| code | text not null | `RD-AAAA-###`; `unique(organization_id, code)` |
| title | text not null | p. ej. "Revisión por la dirección 2026-2" |
| period_start / period_end | date not null | periodo que cubre la revisión |
| meeting_date | date not null | fecha de la reunión |
| attendees | text null | asistentes (texto; en MVP no es relación) |
| scope | text null | alcance/propósito |
| **snapshot** | jsonb not null default '{}' | foto de las entradas automáticas al momento de crear/actualizar (ver §3) |
| **inputs** | jsonb not null default '{}' | entradas de texto de 9.3.2 que no viven en la app (satisfacción, retroalimentación, proveedores, recursos, mejora…) |
| status | text not null default `borrador` | `borrador`→`cerrada` (+ `cancelada`) |
| approved_by | uuid null → profiles | quien firmó al cerrar |
| approved_at / reauth_at | timestamptz null | firma ADR-004 (reautenticación) |
| approval_hash | text null | hash de la firma (ADR-004) |
| ip / user_agent | | contexto de la firma (dato sensible) |
| created_by / created_at / updated_at | | |

### `review_outputs` (salidas 9.3.3: decisiones y acciones de mejora)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| organization_id | uuid not null | |
| review_id | uuid not null → management_reviews(id, org) | |
| kind | text not null | `decision` \| `accion_mejora` \| `recurso` \| `cambio_sgc` |
| description | text not null | el compromiso/decisión |
| responsible_position_id | uuid null → positions(id, org) | a quién se asigna |
| due_date | date null | plazo |
| nonconformity_id | uuid null → nonconformities(id, org) | si la salida se convirtió en una acción de mejora/NC (enlace) |
| created_by / created_at | | |

### `management_review_counters` — numeración atómica `RD-AAAA-###` (igual que `nc_counters`).

**Datos sensibles:** el acta refleja el desempeño del SGC y lleva **firma con IP** (dato personal) →
RLS estricta + auditoría de las mutaciones; la IP solo para quien administra/audita (como en firmas).

### El `snapshot` (jsonb) — por qué jsonb y no relaciones
Las entradas automáticas son una **foto en el tiempo** (números del periodo). Guardarlas como `jsonb`
congela lo que mostró el acta aunque los módulos cambien después (evidencia inmutable del acta), sin
crear 5 tablas de enlace. Estructura (ejemplo):
```
{ "no_conformidades": { "abiertas": 3, "cerradas": 5, "eficaces": 4 },
  "auditorias": { "realizadas": 2, "hallazgos_nc": 1 },
  "indicadores": { "cumplen_pct": 78, "en_riesgo": 2, "no_cumplen": 1 },
  "riesgos": { "altos": 2, "controles_a_tiempo_pct": 90 },
  "documentos": { "vigentes": 40, "por_vencer": 3 },
  "acciones_revision_previa": [ { "descripcion": "...", "estado": "pendiente" } ] }
```

## 3. Estados, entradas y salidas

```
borrador ──(editar entradas de texto, refrescar snapshot, agregar salidas)──▶ close_review(firma) ──▶ cerrada
   └───────────────────────── cancel_review(motivo) ──────────────────────────▶ cancelada
```

### Entradas 9.3.2 — qué se autollena y qué es texto (decisión ADR-016)
| Entrada 9.3.2 | Origen en el MVP |
|---|---|
| Estado de acciones de revisiones **previas** | **Auto** (de `review_outputs` de la última acta cerrada) |
| No conformidades y acciones correctivas | **Auto** (resumen NC del periodo) |
| Resultados de auditorías | **Auto** (auditorías cerradas y hallazgos del periodo) |
| Desempeño de procesos / cumplimiento de **indicadores** | **Auto** (resumen de KPIs) |
| Eficacia de acciones ante **riesgos** | **Auto** (matriz de riesgos / controles a tiempo) + texto |
| Cambios/estado del **control documental** | **Auto** (documentos vigentes / por vencer) |
| Satisfacción del cliente y retroalimentación | **Texto** (`inputs`) |
| Desempeño de proveedores externos | **Texto** (`inputs`) — habrá módulo propio (6) después |
| Adecuación de recursos | **Texto** (`inputs`) |
| Oportunidades de mejora | **Texto** (`inputs`) + se registran como salidas |

El `snapshot` se **recalcula** con un botón "Actualizar datos del sistema" mientras el acta está en
borrador; al cerrar queda congelado.

### Salidas 9.3.3 — `review_outputs`
Lista de **decisiones/compromisos** (tipo, descripción, responsable, plazo). Una salida de tipo
`accion_mejora` puede **generar una NC** con un clic (reutiliza `report_nonconformity`,
`source='mejora'`) y queda enlazada; las demás pueden **generar una tarea** al cargo responsable
(opcional, reutiliza `create_task`). Ver ADR-017.

## 4. Rutas y RLS

### Rutas (fase frontend)
| Ruta | Muestra | Rol |
|---|---|---|
| `/app/revisiones` | Lista de actas (código, periodo, fecha, estado, nº de decisiones) + resumen | `can_see_reviews` |
| `/app/revisiones/[codigo]` | Ficha: datos, **entradas** (tarjetas con el snapshot + campos de texto), **salidas** (decisiones), cierre/firma, trazabilidad | `can_see_reviews` |
| "Nueva revisión" (Sheet) | Líder SIG | |
| "Agregar decisión" / "Actualizar datos" / "Cerrar y firmar" | según rol | |

### Autorización (helpers SQL, espejo de los módulos previos)
- `can_see_reviews(org)` = roles del SIG (`lider_sig`, `lider_proceso`, `responsable_control`,
  `auditor`, `consulta`).
- `can_manage_reviews(org)` = `lider_sig` (crea, edita entradas, agrega salidas, refresca snapshot).
- **Cerrar y firmar**: `lider_sig` (representante de la dirección). **Decisión (ADR-018):** en el MVP
  firma el Líder SIG; una firma adicional de la alta dirección (gerente) queda como iteración futura.

### Políticas
- `management_reviews`, `review_outputs`: **RLS on**, solo **SELECT** con `can_see_reviews`. Sin
  escritura por REST. `management_review_counters`: RLS on, sin políticas (deny-all). La IP de la firma
  se expone solo a quien administra/audita (como `canSeeSignatureIp`).

### Funciones `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event` en cada una)
| Función | Quién | Efecto |
|---|---|---|
| `create_review(org, title, period_start, period_end, meeting_date, scope)` | `can_manage_reviews` | crea `borrador`, asigna `code`, calcula el primer `snapshot` |
| `refresh_review_snapshot(review)` | `can_manage_reviews` | recalcula `snapshot` (solo en borrador) |
| `update_review(review, attendees, scope, inputs)` | `can_manage_reviews` | edita datos y entradas de texto (solo en borrador) |
| `add_review_output(review, kind, description, responsible, due)` | `can_manage_reviews` | agrega una decisión/salida |
| `generate_nc_from_output(output)` | `can_manage_reviews` | si la salida es `accion_mejora` y no tiene NC, llama `report_nonconformity(source='mejora')` y enlaza (idempotente, `for update`) |
| `close_review(review, reauth_at, hash, ip, ua)` | `lider_sig` | `borrador`→`cerrada`, firma ADR-004; congela el snapshot |
| `cancel_review(review, reason)` | `can_manage_reviews` | →`cancelada` |

El `snapshot` lo calcula el servidor dentro de `create_review`/`refresh_review_snapshot` leyendo las
tablas de los módulos (con el `organization_id` del acta), no el cliente.

## 5. Integraciones y riesgos

**Integra con lo existente:**
- **Módulos 1–3 + riesgos + documentos:** fuente de las entradas automáticas (se leen para armar el
  `snapshot`). Sólo lectura agregada; no modifica esos módulos.
- **No Conformidades (Módulo 1):** `generate_nc_from_output` reutiliza `report_nonconformity`
  (`source='mejora'`); enlace en `review_outputs.nonconformity_id`.
- **Firma electrónica (ADR-004):** el cierre del acta se firma con reautenticación + hash + IP, con el
  **mismo patrón** que las firmas de documento pero en campos propios del acta (la tabla `signatures`
  está acoplada a `document_versions`; no se reutiliza esa tabla — ver ADR-018).
- **Tareas + cron/correo:** al crear un acta con fecha de reunión, puede encolarse un recordatorio;
  una salida con responsable puede generar una tarea. **Decisión:** recordatorio de reunión fuera del
  MVP (el valor está en consolidar+firmar); las tareas desde salidas, opcionales (ADR-017).
- **Auditoría (`log_event`)** y **numeración (`management_review_counters`)** reutilizados.
- **Exportación:** el acta se podrá exportar (PDF/impresión del navegador) — reusar el patrón de impresión; PDF server-side queda fuera del MVP.

**Top 3 riesgos técnicos y mitigación:**
1. **El snapshot queda desactualizado o inconsistente** → se recalcula solo en `borrador` y **se congela
   al cerrar**; es evidencia del momento de la revisión, no una vista en vivo.
2. **Fuga entre tenants / permisos / IP de la firma** → RLS solo-SELECT + escritura por RPC con chequeo
   de rol; FKs compuestas; la IP solo a admin/auditor (como las firmas de documento). Espejo de módulos
   ya auditados APTO; pruebas RLS nuevas.
3. **Firma repudiable o alterable** → `close_review` exige reautenticación reciente (ADR-004), registra
   hash + IP + user agent, y el acta cerrada es inmutable (no se edita tras cerrar).

## 6. Plan de migración y fases
- Migración `023_revision_direccion.sql`: tablas + índices que cubren FKs + RLS + helpers + RPCs +
  contador; snapshot calculado en SQL leyendo los módulos.
- Tipos de vista; (opcional) `TaskType` para la salida→tarea si se incluye.
- Pruebas RLS (aislamiento, crear/editar por rol, cerrar+firmar por Líder SIG, snapshot correcto,
  salida→NC enlazada e idempotente, inmutabilidad tras cerrar, numeración).
- Fases siguientes: diseño → frontend → backend → seguridad → testing → deploy.

## 7. ADRs
- **ADR-015** — Módulo Revisión por la dirección: escritura por RPC `SECURITY DEFINER`, visibilidad
  espejo del SIG, numeración `RD-AAAA-###`.
- **ADR-016** — Entradas 9.3.2 como **snapshot `jsonb` semiautomático** (auto desde los módulos +
  texto para lo que no vive en la app), congelado al cerrar.
- **ADR-017** — Salidas 9.3.3 en `review_outputs`; una acción de mejora **genera una NC con un clic**
  (idempotente), y opcionalmente una tarea al responsable.
- **ADR-018** — Cierre del acta firmado con el **patrón ADR-004** (reautenticación + hash + IP) en
  campos propios del acta; no se reutiliza la tabla `signatures` (acoplada a documentos). Firma el
  Líder SIG en el MVP.

---

## Propuesta de alcance (MVP) — PENDIENTE DE APROBACIÓN

### Entra en v1 (tabla feature | ¿v1? | justificación)
| Feature | ¿v1? | Justificación |
|---|---|---|
| Acta con periodo, reunión, asistentes, alcance | ✅ | núcleo del 9.3 |
| **Snapshot automático** de NC, auditorías, indicadores, riesgos, documentos | ✅ | el valor diferencial: consolida sin recapturar |
| Entradas de texto (satisfacción, retroalimentación, proveedores, recursos, mejora) | ✅ | 9.3.2 lo exige y aún no viven en la app |
| **Salidas**: decisiones/compromisos con responsable y plazo | ✅ | 9.3.3 lo exige |
| Salida `accion_mejora` → **genera NC** con un clic | ✅ | cierra el lazo revisión→mejora, barato (reusa NC) |
| **Cerrar y firmar** el acta (ADR-004) + inmutable | ✅ | evidencia formal |
| Lista + ficha + numeración `RD-AAAA-###` | ✅ | consistencia con los módulos |
| Exportar/imprimir el acta | ✅ | el acta se entrega al auditor |
| Salida → **tarea** al responsable | ⬜ (opcional) | útil pero no esencial; decidir |
| Recordatorio de reunión por cron/correo | ❌ | el valor está en consolidar+firmar |
| Firma adicional de la alta dirección (gerente) | ❌ | el Líder SIG firma en el MVP |
| Resumen con IA (Crubol-Agent) de las entradas | ❌ | requiere re-auditoría; diferenciador futuro (ROADMAP) |
| PDF server-side | ❌ | impresión del navegador basta en v1 |

### Camino dorado
Líder SIG crea el acta del periodo → el sistema precarga el snapshot (NC/auditorías/indicadores/
riesgos/documentos) → completa las entradas de texto → registra las decisiones (y convierte las de
mejora en NC) → **cierra y firma** → el acta queda inmutable y exportable.

### Decisiones que necesito de ti (para fijar el alcance)
1. **Snapshot automático** de los 5 bloques (NC, auditorías, indicadores, riesgos, documentos) como
   `jsonb` congelado al cerrar → recomiendo sí.
2. **Entradas de texto** para lo que no vive en la app (satisfacción, proveedores, recursos, mejora) →
   recomiendo sí.
3. **Salidas** = decisiones con responsable+plazo; la de tipo *acción de mejora* **genera NC** con un
   clic → recomiendo sí.
4. **¿Generar también una tarea** al responsable desde una salida en el MVP, o lo dejamos para después?
   (recomiendo diferirlo; la NC ya crea tareas por su cuenta).
5. **Firma**: cierra y firma el **Líder SIG** (representante de la dirección) con reautenticación
   (patrón ADR-004); firma del gerente después → recomiendo así.
6. **Numeración** `RD-AAAA-###` por organización/año → recomiendo sí.
7. **Exportación**: impresión del navegador en v1 (PDF server-side después) → recomiendo sí.
8. **IA**: Crubol-Agent NO resume en el MVP (requiere re-auditoría) → recomiendo así.
