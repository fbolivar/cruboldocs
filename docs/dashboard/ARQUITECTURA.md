# Arquitectura — v1.1-1: Dashboard gerencial transversal + exportación (CrubolDocs)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: M. **Módulo de solo lectura: NO crea tablas, NO añade RLS, NO añade dependencias.** Consolida lo que los 8 módulos ya calculan.

## 1. Negocio

- **Problema y para quién.** La dirección y el Líder SIG no tienen una vista única del estado del SGC: hoy deben entrar a cada módulo. El **Tablero gerencial** responde en una pantalla «¿cómo va el sistema de gestión este periodo?» y deja **evidencia exportable** para la Revisión por la dirección (9.3) y para el auditor externo.
- **Acción de valor principal.** Abrir `/app/tablero`, ver el estado consolidado (NC, auditorías, indicadores, objetivos BSC, PQRS/satisfacción, documentos por vencer) filtrado por **proceso** y **periodo**, y **exportarlo** (CSV por panel + PDF de la vista por impresión del navegador).
- **Cobro.** Sin cobro por módulo; entra en el plan único de v1 (es diferenciador competitivo: los líderes del mercado cobran la reportería aparte).
- **Mercado.** Colombia/B2B. La reportería/BI es la debilidad reconocida de los competidores → aquí ganamos con UX.

## 2. Modelo de dominio

**NO hay dominio nuevo.** El tablero es una **composición de lectura** sobre las tablas y RPCs existentes, todas ya con RLS por `organization_id`:

| Fuente (ya existe) | Qué aporta al tablero |
|---|---|
| `nonconformities` (Mód. 1) | NC abiertas, vencidas, por estado y severidad |
| `audits`/programa (Mód. 2) | auditorías del periodo y su estado |
| `indicators` + `indicator_measurements` (Mód. 3) | % de cumplimiento (cumple/en_riesgo/no_cumple) de la última medición |
| `management_reviews` (Mód. 4) | última revisión por la dirección (enlace) |
| `quality_objectives` + `objectives_with_progress` (Mód. 8) | objetivos por perspectiva BSC y su avance derivado |
| `pqrs_cases` + `satisfaction_measurements` (Mód. 7) | PQRS abiertas/vencidas y satisfacción del último periodo |
| `risks` (transversal) | riesgos por nivel (resumen) |
| `documents` (transversal) | documentos vigentes por vencer |

- **Sin tablas nuevas, sin migración, sin políticas RLS nuevas.** Cada dato se lee con el **cliente del usuario** (`scope().supabase`), de modo que la RLS existente ya acota a la organización activa (sin fuga cross-org). El periodo y el proceso se aplican **en el servidor** dentro de cada consulta de agregado.
- **Dato sensible:** el tablero muestra **conteos y porcentajes agregados**, no datos personales (ni asistentes de actas, ni cliente de PQRS, ni firmantes). No se añade superficie de dato personal.

## 3. Alcance del MVP (cortado agresivo)

| Feature | ¿v1? | Justificación |
|---|---|---|
| Ruta nueva **`/app/tablero`** en el menú (gerencial, aparte de Inicio) | **Sí** | No recargar Inicio (operativo). ADR-035. |
| **KPIs de cabecera** (StatCards): NC abiertas, NC vencidas, auditorías del periodo, % cumplimiento de indicadores, objetivos activos/cumplidos, PQRS abiertas, PQRS vencidas, satisfacción último periodo, documentos por vencer | **Sí** | Es el «estado del SGC» de un vistazo; todo ya se calcula. |
| **Gráficas** (SVG/CSS con tokens, sin librería): NC por estado y por severidad (barras), indicadores por cumplimiento (semáforo), objetivos por perspectiva BSC (barras por perspectiva), PQRS abiertas vs. vencidas | **Sí** | Barras/semáforos simples como `ScoreMeter`/`ObjectiveProgress`. ADR-037. |
| **Satisfacción**: puntaje del último periodo + mini-tendencia de los últimos periodos | **Sí** | Reutiliza `satisfactionList`; cierra la lectura de 9.1.2. |
| **Filtros**: por **proceso** y por **periodo** (año / rango) | **Sí** | Lo primero que pide un gerente; se aplican en servidor. |
| **Exportar CSV** por panel (NC, indicadores, objetivos, PQRS) | **Sí** | `toCsv` ya existe; cero dependencias. ADR-036. |
| **Exportar PDF** de la vista (impresión del navegador con CSS `print`) | **Sí** | Sin dependencia; «Imprimir/Guardar como PDF». ADR-036. |
| Enlaces «ver detalle» de cada panel a su módulo | **Sí** | Navegación natural; barato. |
| **XLSX real** (.xlsx con formato) | **No (diferido)** | Requiere dependencia (`exceljs`); CSV cubre el MVP. ADR-036. |
| **PDF server-side** con plantilla corporativa | **No (diferido)** | Dependencia + render server; la impresión del navegador basta para v1. |
| Tendencias históricas largas (12+ meses) y comparativos interanuales | **No** | Las mediciones viven por periodo; una mini-tendencia basta; evita consultas pesadas. |
| **Resumen por IA** («3 focos del mes» de Crubol-Agent) | **No** | Requiere re-auditoría de seguridad (dato → IA). Solo ROADMAP. ADR-035. |
| Snapshot/caché del tablero | **No** | Lectura en vivo con RLS; no se cachean datos sensibles. ADR-035. |
| Dashboards configurables por el usuario (arrastrar widgets) | **No** | Otro producto; el tablero fijo cubre 9.1/9.3. |

**Camino dorado:** el Líder SIG (o la dirección) abre **Tablero** → elige **periodo** (p. ej. año en curso) y, si quiere, un **proceso** → ve KPIs + gráficas del estado del SGC → **exporta** (CSV los detalles, PDF la vista) → lo adjunta como entrada a la Revisión por la dirección.

Pantallas: **1** (`/app/tablero`, una sola vista con filtros y paneles). Cabe de sobra en el límite de pantallas.

## 4. Mapa de rutas

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/tablero` | Tablero gerencial: filtros (proceso, periodo) + KPIs de cabecera + gráficas (NC, indicadores, objetivos BSC, PQRS/satisfacción) + documentos por vencer; botones «Exportar CSV» por panel e «Imprimir/PDF». | **Ver:** Líder SIG, auditor y **dirección** (gerente/aprobador). Los demás roles del SIG (responsable_control, consulta, líder de proceso) ven el tablero **acotado a sus procesos visibles** por la RLS ya existente. Gate `canSeeDashboard` (ADR-035). |

- El ítem **«Tablero»** se añade al menú lateral (icono tipo `LayoutDashboard`) arriba, junto a Inicio, solo si `canSeeDashboard(user)`.
- No hay sub-rutas ni ficha: es una única vista de lectura.

## 5. Integraciones y riesgos

**Integraciones (reutilizadas, sin dependencias nuevas):** las funciones de `src/lib/data/queries.ts` de cada módulo (resúmenes), `toCsv` (CSV), CSS `print` del navegador (PDF), tokens Hex Core + SVG propio (gráficas). Sin Storage, sin correo, sin cron.

**Top 3 riesgos y mitigación:**
1. **Fuga entre organizaciones.** → Todas las lecturas usan `scope().supabase` (cliente del usuario) y las tablas ya tienen RLS por `organization_id`; el tablero **no** usa `service_role` ni admin. Se verifica en la auditoría que ningún agregado consulte sin filtro de org. (Sin RLS nueva porque no hay tabla nueva.)
2. **Dependencias nuevas (regla invariable).** → **Cero dependencias** en el MVP: CSV con `toCsv`, PDF por impresión del navegador, gráficas en SVG/CSS con tokens. XLSX y PDF server-side quedan diferidos con su justificación de una línea si se piden (ADR-036).
3. **Rendimiento (muchas consultas de resumen).** → Se ejecutan en **paralelo** (`Promise.all`) y son **agregados baratos** (conteos/últimas mediciones) ya usados en Inicio y en cada módulo; el **periodo y el proceso se aplican en el servidor** (no se traen filas y se filtran en el cliente). Si algún agregado resultara costoso, se añade índice (no bloquea el MVP).

## Decisiones (ADR)
- **ADR-035** — Ruta `/app/tablero` gerencial (aparte de Inicio), lectura **en vivo** con RLS (sin snapshot/caché de datos sensibles), visible a Líder SIG/auditor/dirección; IA y dashboards configurables fuera del MVP.
- **ADR-036** — Exportación **sin dependencias nuevas** en el MVP: **CSV** con `toCsv` por panel + **PDF** por impresión del navegador (CSS `print`); **XLSX** y **PDF server-side** diferidos (cada uno justificaría su dependencia).
- **ADR-037** — Gráficas con **SVG/CSS propio y tokens** (barras y semáforos simples, patrón `ScoreMeter`/`ObjectiveProgress`), siguiendo la skill `dataviz`; una librería (recharts/visx) solo si se requiere una gráfica que el SVG propio no cubra, justificada en una línea.

## Checklist de salida
- [x] Multi-tenant reutilizado (RLS existente; sin dominio nuevo).
- [x] MVP en 1 pantalla.
- [x] Camino dorado de punta a punta (filtrar → ver → exportar → adjuntar a 9.3).
- [x] Riesgos con mitigación (fuga cross-org, dependencias, rendimiento).
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
