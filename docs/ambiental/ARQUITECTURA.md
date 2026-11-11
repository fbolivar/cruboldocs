# Arquitectura — v1.1-4b: Aspectos e impactos ambientales (ISO 14001 6.1.2)

> Estado: **PROPUESTA — pendiente de decisión y aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: S–M. Completa el bloque 14001 del Sistema Integrado (el #4 entregó multi-norma + SST; faltaba la **matriz de aspectos e impactos ambientales**). Espejo del patrón de Peligros/Requisitos (RPC server-side para la significancia, baja lógica, numeración).

## 1. Negocio

- **Problema y para quién.** 14001 (6.1.2) exige **identificar los aspectos ambientales** de las actividades y **determinar cuáles son significativos**. Hoy no hay registro. Lo usa el **coordinador ambiental / Líder SIG** (y el Líder del proceso dueño); el resto del SIG consulta.
- **Acción de valor principal.** Registrar un **aspecto** (actividad → aspecto → impacto, condición normal/anormal/emergencia), **valorar su significancia** (criterios en el servidor), ligar su **control** y, si aplica, su **requisito legal** (Módulo v1.1-3); ver la **matriz** y exportarla.
- **Cobro.** Sin cobro por módulo; cierra 14001 para la venta de SIG.
- **Mercado.** Colombia/B2B.

## 2. Modelo de dominio

Reutiliza `organizations`/`processes`/`positions`/`legal_requirements`. Multi-tenant por `organization_id`, FKs compuestas, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER`.

1. **`env_aspects`** — aspecto ambiental. `id, organization_id, code (ASP-AAAA-###), process_id?, activity text (actividad), aspect text (aspecto: p. ej. "vertimiento de aguas"), impact text (impacto: p. ej. "contaminación del recurso hídrico"), condition ('normal'|'anormal'|'emergencia'), controls text?, legal_requirement_id? (→ legal_requirements), responsible_position_id?, [criterios de valoración], significance ('significativo'|'no_significativo'), status ('activo'|'inactivo') default 'activo', next_review_date date?, created_by/at, updated_at`. `unique(organization_id, code)`, `unique(id, organization_id)`.
2. **`env_counters`** — contador atómico `ASP-AAAA-###` (deny-all).

Se **etiqueta con 14001** automáticamente (o vía `entity_norms` añadiendo `entity_type 'aspecto_ambiental'`); el módulo es inherentemente 14001.

### Significancia (a decidir — ver §3)
La significancia se **calcula en el servidor** a partir de criterios; no se teclea suelta (coherente con GTC-45/Indicadores).

### Datos sensibles
No hay dato personal (aspectos y su valoración).

## 3. Decisión de alcance (lo que necesito que decidas)

**Método de significancia.** Las organizaciones usan matrices distintas para 14001 (a diferencia de GTC-45, que es estándar). Opciones:

| Opción | Cómo | Recomendación |
|---|---|---|
| **A. Índice ponderado estándar (recomendado)** | 4 criterios con escala 1–3: **Frecuencia**, **Severidad**, **Alcance** y **Cumplimiento legal**; Índice = suma (4–12); **Significativo** si Índice ≥ 8 **o** condición = emergencia **o** tiene requisito legal asociado. Calculado en el servidor. | **A** — un método claro, server-side, suficiente para auditar; documentado y editable a futuro. |
| B. Bandera manual | El evaluador marca "significativo" sí/no con justificación, sin cálculo. | Más simple pero menos defendible ante auditor; el "cómo se determinó" queda en texto. |
| C. Matriz configurable | El cliente define sus propios criterios/escala/umbral. | Es, en esencia, el **Constructor de formularios (#5)**; sobredimensiona este módulo. |

Si eliges **A**, el servidor guarda los 4 criterios + el índice + la significancia derivada. Si prefieres otros criterios/umbral (p. ej. escala 1–5, o añadir "Probabilidad"/"Recuperabilidad"), dímelo y ajusto.

## 4. Alcance MVP (si A)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Registrar/editar **aspecto** (`ASP-AAAA-###`, actividad, aspecto, impacto, condición, proceso, controles) | **Sí** | Base del módulo. |
| **Valoración de significancia** (4 criterios 1–3 → índice → significativo, server-side) con semáforo | **Sí** | El núcleo de 6.1.2. |
| Ligar a **requisito legal** (v1.1-3) opcional | **Sí** | Conecta aspecto↔obligación legal; barato. |
| Matriz: tablero (filtros condición/significancia/proceso/buscar) + **CSV** | **Sí** | La matriz ambiental exportable. |
| Baja lógica (inactivar); recordatorio de **revisión** por el job | **Sí** | Ciclo de vida sin DELETE; reutiliza tasks+cron. |
| Aspecto significativo → **objetivo/NC** con un clic | **No (diferido)** | Se evalúa en uso. |
| Ciclo de vida del producto, cuantificación (kg CO₂, m³) | **No** | Fuera del MVP. |

**Camino dorado:** el coordinador ambiental registra un **aspecto** (actividad "lavado de equipos" → aspecto "vertimiento" → impacto "contaminación hídrica", condición normal) → valora (Frecuencia 3, Severidad 3, Alcance 2, Legal 3 → índice 11 → **Significativo**) → liga el requisito legal y el control → la matriz lo muestra; exporta para la auditoría 14001.

Pantallas: `/app/aspectos-ambientales` (matriz) + `/app/aspectos-ambientales/[codigo]` (ficha).

## 5. Integraciones y riesgos

**Integraciones:** procesos/cargos, `legal_requirements` (enlace), tareas+cron (revisión), `log_event`, CSV, `entity_norms` (etiqueta 14001). Sin dependencias nuevas.

**Top 3 riesgos y mitigación:**
1. **Método de significancia discutible.** → Server-side, documentado (ADR); umbral y criterios fijos en v1, ajustables; si el cliente exige su propia matriz, se usará el Constructor de formularios (#5).
2. **Aislamiento multi-tenant.** → `organization_id` + FKs compuestas (incl. `legal_requirement_id`) + RLS solo-SELECT; escritura por RPC con `can_manage` por proceso; prueba 2 organizaciones.
3. **Solape con Peligros (SST).** → Son dominios distintos (ambiental vs. seguridad y salud); no se mezclan, igual que Peligros no se mezcló con Riesgos de calidad.

## Decisiones (ADR, al aprobar)
- **ADR-049** — `env_aspects` + `env_counters`; **significancia calculada en el servidor** por índice ponderado (4 criterios 1–3; umbral ≥8 o emergencia o requisito legal); baja lógica `inactivo`.
- **ADR-050** — Enlace opcional a **requisito legal** (v1.1-3) y etiqueta **14001** vía `entity_norms` (`entity_type 'aspecto_ambiental'`); revisión periódica por el job diario; aspecto→objetivo/NC diferido.

## Checklist de salida
- [x] Multi-tenant (org + RLS).
- [x] Camino dorado de punta a punta.
- [x] Riesgos con mitigación.
- [ ] **Fernando decide el método de significancia (A/B/C) y aprueba el alcance.**
