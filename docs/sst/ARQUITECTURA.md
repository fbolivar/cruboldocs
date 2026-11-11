# SG-SST — Autoevaluación de Estándares Mínimos (Resolución 0312 de 2019) — Arquitectura

> Entregable de la **fase de arquitectura** (feature #2 del roadmap v1.2). Define alcance, modelo,
> rutas, integraciones y riesgos **antes** de escribir código. Fecha: 2026-11-11.
> **Pendiente de aprobación de Fernando (parada obligatoria de alcance).** No se escribe código ni
> migraciones en esta fase.

## 1. Negocio
- **Problema que resuelve:** toda empresa y contratante en Colombia debe **autoevaluar** su SG-SST
  contra los **Estándares Mínimos** de la Resolución 0312 de 2019 (anualmente, y reportar el avance),
  y formular un **plan de mejoramiento** según el resultado. Hoy casi nadie lo automatiza bien (ni
  KAWAK a fondo); es un **diferenciador local defendible** y reusa lo ya construido (Peligros/GTC-45).
- **Acción de valor:** el responsable del SG-SST diligencia la autoevaluación, el sistema **calcula el
  puntaje y la valoración** (Crítico / Moderadamente aceptable / Aceptable, art. 28) y genera el
  **plan de mejoramiento** de lo incumplido con responsables y plazos.
- **Cobro:** parte de la suite (sin cobro aparte en v1).
- **Mercado:** Colombia. Decisión de Fernando (2026-11-11): soportar **los 3 niveles** (7/21/60) según
  tamaño y clase de riesgo.

## 2. Modelo de dominio

### Catálogo nacional de referencia (global, NO por organización; sembrado del Anexo de la 0312)
- **`sst_standards`**: `id`, `code` (p. ej. `1.1.1`), `name`, `cycle` (planear/hacer/verificar/actuar),
  `component` (recursos / gestion_integral / gestion_salud / peligros_riesgos / gestion_amenazas /
  verificacion / mejoramiento), y **peso por nivel**: `weight_7`, `weight_21`, `weight_60`
  (`null` si el estándar **no aplica** a ese nivel). Los pesos salen textuales del Anexo oficial; cada
  nivel suma 100% sobre sus ítems aplicables. Tabla **de solo lectura** para los clientes (RLS select a
  `authenticated`); se siembra una vez y la mantiene la plataforma.
  - Pesos por ciclo PHVA (nivel 60): **Planear 25%** (Recursos 10 + Gestión integral 15), **Hacer 60%**
    (Gestión de la salud 20 + Peligros y riesgos 30 + Gestión de amenazas 10), **Verificar 5%**,
    **Actuar 10%**. Total 100%.

### Por organización (multi-tenant, RLS por `organization_id`)
- **`sst_evaluations`** (una autoevaluación por período): `id`, `organization_id`, `code`
  (SGSST-AAAA-###), `period` (año), `worker_count`, `risk_class` (I–V) → **`tier`** (7/21/60) derivado
  al crear, `status` (borrador/cerrada), `score` numeric (calculado en servidor), `rating`
  (critico/moderado/aceptable), `created_by`, `closed_at`.
- **`sst_evaluation_items`** (un ítem por estándar aplicable al nivel): `id`, `organization_id`,
  `evaluation_id`, `standard_id`, `status` (**cumple / no_cumple / no_aplica**), `justification`
  (obligatoria si `no_aplica`). El **peso obtenido** se deriva en servidor (peso del nivel si `cumple`
  o `no_aplica` justificado; 0 si `no_cumple`).
- **`sst_actions`** (plan de mejoramiento): `id`, `organization_id`, `evaluation_id`, `standard_id`
  (el ítem incumplido), `description`, `responsible_position_id`, `due_date`, `status`
  (pendiente/en_curso/hecha/cancelada). Recordatorios por el **cron** (tarea `cumplir_mejora_sst`,
  entity `sst`), como en los demás módulos.
- **`sst_counters`** (deny-all) para la numeración atómica `SGSST-AAAA-###`.
- **Dato personal:** este módulo evalúa el **sistema**, no registros médicos individuales. No se
  capturan datos de salud de trabajadores en el MVP (la "gestión de la salud" operativa se difiere).

### Cálculo en servidor (como GTC-45 / significancia ambiental)
Un RPC calcula `score` = suma de pesos obtenidos de los ítems **aplicables al nivel**, y deriva
`rating` por los umbrales del **art. 28** (se toman **textuales** del oficial en la fase de contenido;
referencia habitual: Crítico < 60%, Moderadamente aceptable 60–85%, Aceptable > 85%). El cliente nunca
calcula el puntaje.

## 3. Alcance del MVP

| Feature | ¿v1? | Justificación |
|---|---|---|
| Catálogo nacional de 60 estándares (+ aplicabilidad y pesos por nivel 7/21/60) | **Sí** | Base de todo; se siembra del Anexo oficial. |
| Autoevaluación por período (Cumple/No cumple/No aplica) con nivel por tamaño+riesgo | **Sí** | Núcleo del módulo. |
| Puntaje y valoración (art. 28) calculados en servidor | **Sí** | Trazable y defendible ante auditoría; patrón ya probado. |
| Plan de mejoramiento por ítem incumplido + recordatorios (cron) | **Sí** | Lo exige la norma; reusa tareas/cron. |
| Enlace suave a Peligros/GTC-45 (componente "Peligros y riesgos", 30%) | **Sí (soft)** | Reusa lo construido; sin dependencia dura. |
| **Plan de trabajo anual del SG-SST** | **No** (diferido) | Feature grande; se hará en fase siguiente reusando el patrón de Plan de acción. |
| **Indicadores SST** (frecuencia, severidad, ausentismo, mortalidad) | **No** (diferido) | Se reusará el módulo de Indicadores; fuera de este MVP. |
| Generación automática de documentos / reporte a la ARL o Ministerio | **No** (diferido) | No es el núcleo; se evalúa luego. |
| Registros médicos / datos de salud individuales | **No** | PII sensible; fuera de alcance del MVP. |

**Camino dorado:** definir tamaño+riesgo → crear autoevaluación del período → diligenciar cada estándar
(Cumple/No cumple/No aplica+justificación) → ver puntaje y valoración (semáforo) → generar plan de
mejoramiento de lo incumplido → cerrar.

## 4. Mapa de rutas
- **`/app/sg-sst`** (tablero): autoevaluación vigente con **puntaje + valoración** (semáforo), nº de
  estándares cumplidos/incumplidos/no aplica, historial de autoevaluaciones, y **"Nueva
  autoevaluación"** (define período, nº de trabajadores y clase de riesgo → fija el nivel). Ver = roles
  del SIG; gestionar = Líder SIG (o Líder de proceso / responsable del SG-SST).
- **`/app/sg-sst/[codigo]`** (ficha de una autoevaluación): estándares **agrupados por ciclo PHVA y
  componente**, cada uno con Cumple/No cumple/No aplica (+justificación); el **puntaje por fase** y la
  **valoración total**; y el **plan de mejoramiento** (acciones de los incumplidos). Modo solo lectura
  cuando está cerrada o el usuario no gestiona.

## 5. Integraciones y riesgos
- **Integraciones:** tareas+cron (recordatorio de acciones de mejora); multi-norma (etiqueta **45001**
  vía `entity_norms`, suave); enlace a **Peligros/GTC-45**; auditoría `log_event`; exportación CSV.
- **Riesgos (top 3) y mitigación:**
  1. **Exactitud del catálogo y los pesos** (si un peso o la aplicabilidad por nivel están mal, el
     puntaje es inválido) → **sembrar del Anexo oficial** y **calcular en servidor** con **pruebas** que
     verifiquen que cada nivel suma 100% y que el puntaje coincide con casos conocidos.
  2. **Umbrales de valoración** (art. 28) mal transcritos → tomarlos **textuales** del oficial; prueba
     de los límites.
  3. **Cambios normativos** (el Ministerio actualiza estándares) → el catálogo es una **tabla de
     referencia versionable**; un cambio es sembrar una nueva versión, sin tocar las autoevaluaciones
     ya cerradas (conservan su resultado).

## 6. ADRs
- **ADR-054** — Autoevaluación 0312: puntaje y valoración **calculados en servidor**; catálogo nacional
  **sembrado** y de solo lectura; **3 niveles** (7/21/60) por tamaño y clase de riesgo.
- **ADR-055** — Alcance del MVP: autoevaluación + valoración + **plan de mejoramiento** (reusa
  tareas/cron); **plan de trabajo anual e indicadores SST diferidos**.

---

> Parada obligatoria: Fernando aprueba este alcance antes de pasar a diseño.
