# ROADMAP de producto — CrubolDocs

> Decisión de Fernando (2026-11-10): **Opción A — construir hacia un SGC completo** (suite ISO 9001),
> no quedarse en "control documental + riesgos". Objetivo: ser comparable con Isolución / KAWAK /
> ISOTools, pero con mejor UX, seguridad multi-tenant e IA (Crubol-Agent) como diferenciadores.

## Dónde estamos (v1, en producción)

Cubierto y sólido: **gestión documental** (flujo elaborador→revisor→aprobador, versiones, firma
electrónica con hash, confirmación de lectura, distribución por cargo, revisión periódica),
**riesgos** (valoración, controles, evidencias), **mapa de procesos**, **cargos/roles**,
**recertificación de accesos**, **auditoría inmutable**, **Crubol-Agent** (IA para el catálogo).

Esto equivale a ~2–3 de los ~10 módulos de una suite ISO 9001. Falta el bloque de **Evaluación del
desempeño (ISO 9001 cap. 9)** y **Mejora (cap. 10)**.

## Secuencia de módulos (orden por impacto)

| # | Módulo | Cláusula ISO | Por qué / qué reutiliza | Esfuerzo |
|---|---|---|---|---|
| 1 | **No Conformidades + Acciones (CAPA)** | 10.2 | Cierra el ciclo de mejora; sin esto no se certifica. Reutiliza cargos, tareas, evidencias, auditoría. | M |
| 2 | **Auditorías internas** (programa, lista de verificación, hallazgos) | 9.2 | Alimenta las No Conformidades. Ya existe el rol `auditor` y el log. | M–L |
| 3 | **Indicadores de gestión (KPIs)** por proceso | 9.1 | Muy pedido; reportería es debilidad de los competidores → ganamos con UX. | M |
| 4 | **Revisión por la dirección** (acta que consolida 1–3 + riesgos) | 9.3 | Barato una vez existan 1–3; consolida entradas. | S |
| 5 | Competencias / capacitación (perfil del cargo, formación, evaluación) | 7.2 | Extiende cargos y confirmación de lectura. | M |
| 6 | Proveedores (evaluación y reevaluación) | 8.4 | Nuevo dominio. | M |
| 7 | PQRS / quejas y satisfacción del cliente (encuestas) | 9.1.2 | Entrada a revisión por la dirección. | M |
| 8 | Actas / reuniones · Planeación estratégica y objetivos (BSC) | 6.2 | Completa la suite. | L |

Esfuerzo orientativo: S pequeño · M mediano · L grande (por sesión/fase, no días calendario).

## Diferenciadores a sostener en todos los módulos

- **UX moderna y consistente** (los líderes arrastran UX anticuada y reportería floja).
- **Seguridad y multi-tenant** (RLS por `organization_id`, firma con hash, auditoría inmutable).
- **Crubol-Agent**: hoy configura el catálogo; a futuro (con re-auditoría previa) puede ayudar a
  redactar documentos, sugerir controles, **clasificar/analizar no conformidades** y **resumir la
  revisión por la dirección**. Es la ventaja real frente a competidores que apenas rotulan "IA".
- **Sin cobro por módulo que se dispara** (queja recurrente de la competencia).

## Principios de construcción (invariables del proyecto)

Cada módulo sigue el pipeline por fases: arquitectura → diseño → frontend → backend → seguridad →
testing. Toda tabla con RLS por `organization_id`, cambios por migración, parada de aprobación de
Fernando en el alcance del MVP y en la auditoría de seguridad. Reutilizar lo existente (cargos,
tareas, evidencias, cron, auditoría, correo) antes de crear nuevo.

---

## Módulo 1 — No Conformidades / CAPA · Propuesta de alcance (MVP) — PENDIENTE DE APROBACIÓN

**Qué resuelve:** registrar una no conformidad, analizar su causa, planear y ejecutar acciones con
responsable y plazo, adjuntar evidencia, verificar la eficacia y cerrarla — con trazabilidad y
tareas, igual que el resto de la app.

**Flujo de estados propuesto:**
`Abierta → Análisis de causa → Plan de acción → En ejecución → Verificación de eficacia → Cerrada`
(+ `Reabierta` si la verificación falla, `Anulada` con justificación).

**Entidades (borrador, se afinan en la fase de arquitectura):**
- `nonconformities`: `organization_id`, código (NC-AAAA-###), origen (auditoría interna/externa,
  queja/PQRS, producto o servicio no conforme, riesgo materializado, mejora, otro), `process_id`,
  descripción, detectada_por (cargo)/fecha, severidad, `owner_position_id`, estado, causa_raíz.
- `nc_actions`: `nc_id`, tipo (**corrección** inmediata / **acción correctiva** / **preventiva-mejora**),
  descripción, `responsible_position_id`, fecha_límite, estado, completada_en, evidencia.
- Verificación de eficacia: verificada_por/fecha, eficaz (sí/no), notas → cierra o reabre.
- Enlaces opcionales a su origen: `risk_id`, documento/versión (más adelante, `audit_finding_id`).
- Evidencias en Storage (patrón existente) y **tareas** para los responsables (cron marca vencidas).

**Reutiliza:** cargos/roles, tareas + cron de vencimientos, evidencias/Storage, auditoría, correo.

**Fuera del MVP (siguientes iteraciones):** módulo de auditorías internas que las origine (módulo 2),
métodos guiados de causa raíz (5 porqués/Ishikawa), y apoyo del agente para clasificar/analizar
(requiere la re-auditoría de seguridad ya acordada).

### Decisiones que necesito de ti (para fijar el alcance)

1. **Tipos de acción:** ¿distinguimos corrección (inmediata) vs. acción correctiva vs. preventiva/mejora? (recomiendo sí).
2. **Causa raíz:** ¿texto libre en el MVP y métodos guiados después? (recomiendo sí).
3. **Quién gestiona:** propongo **Líder SIG** (todas) y **Líder de proceso** (las de su proceso); el **auditor** puede reportar; la eficacia la verifica el Líder SIG o el dueño. ¿De acuerdo?
4. **Numeración:** ¿`NC-2026-001` por organización y año? (recomiendo sí).
5. **Quién puede "reportar" una NC:** ¿solo roles del SIG, o cualquier miembro activo puede abrir una NC que luego un líder valida? (recomiendo que cualquiera reporte, un líder la gestiona).
6. **Verificación de eficacia:** ¿obligatoria antes de cerrar? (recomiendo sí — es lo que exige el auditor externo).
