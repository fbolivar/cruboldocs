# Arquitectura — Tablero configurable

**Producto:** CrubolDocs · **Feature:** v1.3-3b · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** el tablero gerencial (`/app/tablero`) es útil pero **fijo**; cada rol quiere ver lo suyo primero. Suite Visión vende tableros a medida; un tablero **personalizable** sube la percepción de "suite seria".
- **Acción de valor:** cada usuario **muestra/oculta y reordena** los bloques del tablero (los que ya calcula hoy), y su arreglo se guarda y lo acompaña entre dispositivos.
- **Decisiones (Fernando, 2026-11-11):** configuración **por usuario**; persistencia en **tabla nueva con RLS**; reordenar con **botones ↑/↓** (sin dependencia). No se crean widgets nuevos (se reusan los 8 bloques existentes).
- **Cobro:** incluido. Sin dato personal nuevo.

## 2. Modelo de dominio
Una tabla nueva; los datos del tablero no cambian (siguen saliendo de `getDashboard`).

### `dashboard_preferences`
| Campo | Tipo | Notas |
|---|---|---|
| organization_id | uuid NOT NULL → organizations | |
| user_id | uuid NOT NULL default auth.uid() | |
| layout | jsonb NOT NULL | lista ordenada de **claves de bloque visibles** (p. ej. `["panel_nc","kpi_desempeno",…]`) |
| updated_at | timestamptz | |
| **PK** (organization_id, user_id) | | una preferencia por usuario y organización |

**RLS:** `select`/`insert`/`update` solo sobre la **propia** fila (`user_id = auth.uid()`). Escritura por RPC `set_dashboard_layout(p_org, p_layout jsonb)` `SECURITY DEFINER` (upsert, valida `is_active_member` y que las claves pertenezcan al catálogo).

### Catálogo canónico de bloques (en código, no en BD) — ADR-069
8 claves: `kpi_mejora`, `kpi_desempeno`, `kpi_cliente`, `kpi_documentos`, `panel_nc`, `panel_indicadores`, `panel_objetivos`, `panel_pqrs`. El `layout` guardado se **fusiona** con el catálogo: claves desconocidas se ignoran; claves nuevas (si en el futuro se agregan bloques) se **anexan visibles** al final. Así el tablero nunca queda inconsistente.

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Mostrar/ocultar los 8 bloques | **Sí** | Núcleo |
| Reordenar los bloques (↑/↓) | **Sí** | Decisión de Fernando |
| Persistencia por usuario (tabla + RLS) | **Sí** | Decisión de Fernando |
| "Restablecer" al orden por defecto | **Sí** | Barato y útil |
| Preferencia por organización (Líder SIG) | No | Se descartó a favor de por-usuario |
| Widgets a medida / gráficos nuevos | No | Fuera del MVP |
| Arrastrar y soltar | No | Botones ↑/↓ (sin dependencia) |

**Camino dorado:** abrir `/app/tablero` → "Personalizar" → ocultar los bloques que no uso y subir "PQRS" al tope → guardar → el tablero se reordena y queda así la próxima vez, en cualquier equipo.

## 4. Mapa de rutas
- **`/app/tablero`** (sin cambios de ruta): lee el `layout` del usuario y renderiza los bloques en ese orden, saltando los ocultos. Botón **"Personalizar"** abre un Sheet con la lista de bloques (toggle de visibilidad + ↑/↓ + "Restablecer"). Misma gate actual (`canSeeDashboard`).
- Sin ítem de menú nuevo.

## 5. Integraciones y riesgos
**Servicios externos / dependencias:** **ninguno nuevo.**

**Top 3 riesgos y mitigación:**
1. **Inconsistencia si cambian los bloques** → el `layout` se fusiona con el catálogo canónico (claves desconocidas se ignoran, nuevas se anexan visibles); el servidor valida las claves en el upsert.
2. **Primera visita sin preferencia** → default = los 8 bloques en el orden actual; no hay estado roto.
3. **Escritura cruzada entre usuarios** → RLS por `user_id = auth.uid()` + RPC que fija `user_id = auth.uid()`; nadie edita la preferencia de otro.

## ADRs

### ADR-068 — Preferencia del tablero por usuario (tabla + RLS)
**Contexto:** la personalización debe persistir entre dispositivos y no filtrarse entre usuarios; localStorage no sincroniza.
**Decisión:** tabla `dashboard_preferences` con PK (organization_id, user_id), RLS sobre la propia fila, y upsert por RPC `set_dashboard_layout`. Por usuario (no por organización).
**Consecuencias:** persistencia real y aislada; una fila por usuario/organización (crecimiento mínimo); sin tablero único de organización (se descartó).

### ADR-069 — Layout como lista de claves fusionada con el catálogo
**Contexto:** guardar la estructura de los bloques en BD la volvería frágil ante cambios de UI.
**Decisión:** el catálogo de bloques vive en código; el `layout` es solo una lista ordenada de **claves visibles**; al leer se fusiona con el catálogo (ignora desconocidas, anexa nuevas visibles). Reordenar con botones ↑/↓.
**Consecuencias:** el tablero nunca queda inconsistente al evolucionar; sin dependencia de drag-and-drop; el orden/visibilidad es simple de validar.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (Sheet "Personalizar"). Luego backend, seguridad y deploy. Después, #4 PWA con foto.
