# Arquitectura — Calidad predictiva: Focos de riesgo (v1.5-4)

**Producto:** CrubolDocs · **Feature:** v1.5-4 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** el SGC acumula señales (NC, vencimientos, indicadores, proveedores) pero no hay una vista que las concentre para pasar de reactivo a **proactivo**. El mercado 2026 lo llama "calidad predictiva".
- **Acción de valor:** un **tablero de focos de riesgo** que, por **reglas y tendencias** sobre los datos existentes, resalta lo que requiere atención, con su **severidad** y un **enlace al detalle**.
- **Decisiones (Fernando):** (1) **ruta propia `/app/focos`**; (2) **4 señales**: vencimientos acumulados, indicadores en caída, NC recurrentes por proceso, proveedores en descenso; (3) **mostrar con severidad + enlace**, umbrales fijos, **sin efectos secundarios** (no genera tareas ni avisos).
- **Sin IA:** es un motor de reglas/tendencias, no un modelo. Sin costo por uso.

## 2. Modelo / técnica
- **Sin cambios de base de datos.** Un módulo server `src/lib/focos/engine.ts` carga los datos con el **cliente del usuario** (RLS) desde las tablas ya existentes y produce una lista de **`RiskSignal`** `{ category, severity: 'alta'|'media'|'baja', title, detail, count, href }` (cómputo en memoria, volumen bajo por organización, igual que el motor de informes, ADR-098).
- **Señales (reglas fijas):**
  - **Vencimientos acumulados:** acciones CAPA vencidas (`nc_actions` no hechas con `due_date < hoy`), SCAR vencidos (`scars` en enviada/respondida con `due_date < hoy`), documentos con **revisión vencida**, tareas pendientes vencidas. Severidad por cantidad/antigüedad.
  - **Indicadores en caída:** última medición **incumple**, o **tendencia descendente** en las últimas 3 mediciones. Severidad por brecha/consecutividad.
  - **NC recurrentes por proceso:** procesos con **≥3 NC** en los últimos 6 meses, o NC **reabiertas** (`reopened_count>0`). Severidad por recurrencia.
  - **Proveedores en descenso:** última evaluación **rechazado/condicionado**, o SCAR **sin responder vencido**. Severidad por criticidad del proveedor.
- **Salida:** la página agrupa los `RiskSignal` por **severidad** (alta → baja) y los enlaza (a la NC/indicador/proveedor o a la lista filtrada / bandeja). Umbrales fijos en código (`src/lib/focos/rules.ts`), documentados.
- **Autorización:** visible a roles SIG (igual que el tablero/indicadores); cada enlace respeta la RLS de su módulo.

## 3. Alcance del MVP
| Feature | ¿v1.5-4? | Justificación |
|---|---|---|
| Ruta `/app/focos` con focos por severidad | **Sí** | Núcleo |
| Señal: vencimientos acumulados | **Sí** | Mayor valor |
| Señal: indicadores en caída (incumple / tendencia) | **Sí** | Alerta temprana |
| Señal: NC recurrentes por proceso / reabiertas | **Sí** | Focos sistémicos |
| Señal: proveedores en descenso | **Sí** | Cadena de suministro |
| Enlace de cada foco al detalle | **Sí** | Accionable |
| Umbrales/reglas configurables por organización | No | Fijos en v1 (ajustables en código) |
| Convertir un foco en tarea o avisar por Slack/Teams | No | Sin efectos secundarios (diferido) |
| Persistir/historiar los focos; gráficas de tendencia | No | Se calculan al vuelo; diferido |
| Predicción con IA/ML | No | Reglas/tendencias, no modelo |

**Camino dorado:** el Líder SIG abre **Focos**, ve arriba los de **severidad alta** (p. ej. "3 acciones CAPA vencidas en Compras", "Indicador de satisfacción en caída 3 periodos", "Proveedor crítico rechazado"), pulsa un foco y llega directo a la entidad para actuar.

## 4. Mapa de rutas
- **`/app/focos`** — tablero de focos de riesgo, agrupados por severidad, cada uno con enlace. Visible a roles SIG. Nav "Focos".
- Sin rutas públicas ni cambios en otras rutas.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna.

**Top 3 riesgos y mitigación:**
1. **Costo de cómputo** → lecturas acotadas con RLS (volumen bajo por organización); se cargan solo los campos necesarios; la página se cachea por request.
2. **Ruido (demasiados focos)** → umbrales sensatos y agrupación por severidad; cada señal resume (cantidad + proceso) en vez de listar todo.
3. **Fuga entre organizaciones** → todas las lecturas usan el cliente del usuario (RLS por `organization_id`); los enlaces van a rutas ya protegidas.

## ADRs

### ADR-112 — Motor de reglas en memoria sobre lecturas con RLS (sin tablas, sin IA)
**Contexto:** los datos ya existen; no hace falta persistir señales ni un modelo.
**Decisión:** `engine.ts` carga con el cliente del usuario y calcula los `RiskSignal` al vuelo; reglas fijas en `rules.ts`.
**Consecuencias:** cero cambios de esquema y de costo; el precio es que no hay historial de focos (diferido).

### ADR-113 — Focos de solo lectura con enlace, sin efectos secundarios
**Contexto:** evitar duplicar tareas/avisos y lógica de de-duplicación.
**Decisión:** cada foco solo muestra severidad + enlace al detalle; no crea tareas ni envía notificaciones.
**Consecuencias:** simple y seguro; convertir focos en tareas/avisos queda diferido.

### ADR-114 — Cuatro señales curadas con umbrales fijos
**Contexto:** acotar y dar valor inmediato.
**Decisión:** vencimientos, indicadores en caída, NC recurrentes, proveedores en descenso; umbrales fijos documentados.
**Consecuencias:** cobertura útil sin configuración; los umbrales se ajustan en código si hace falta.

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (tablero de focos por severidad). Luego la capa de cómputo + la página, seguridad, deploy. **Cierra el roadmap v1.5.**
