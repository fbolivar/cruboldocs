# Arquitectura — v1.1-4: Sistema Integrado de Gestión multi-norma (ISO 9001/14001/45001 · SG-SST)

> Estado: **PROPUESTA — pendiente de decisiones y aprobación de Fernando (parada obligatoria).**
> Fecha: 2026-11-10. Esfuerzo: L. Es el gap más grande vs. el mercado colombiano (KAWAK/Isolución venden el motor para varias normas; SG-SST es obligatorio por el Dec. 1072). Toca dominio transversal → requiere tus decisiones antes de diseñar.

## 1. Negocio

- **Problema y para quién.** Hoy la suite es un SGC de **calidad (9001)**. Las organizaciones colombianas suelen operar un **Sistema Integrado de Gestión** (9001 + 14001 ambiental + 45001/SG-SST seguridad y salud). Quieren **una sola plataforma** que etiquete su trabajo por norma y añada los **registros propios** de cada una. Lo usa el Líder SIG / responsable de SST / coordinador ambiental.
- **Acción de valor principal.** (a) **Etiquetar** procesos, documentos, riesgos, no conformidades, objetivos y requisitos por **norma**, y filtrar/reportar por norma; (b) contar con los **registros propios** mínimos de 45001 (matriz de peligros) y 14001 (aspectos ambientales).
- **Cobro.** Sin cobro por módulo; es el gran diferenciador de venta (abre el mercado SG-SST).
- **Mercado.** Colombia/B2B; SG-SST es exigible por ley → mercado enorme por sí solo.

## 2. Modelo de dominio (propuesta)

Reutiliza todo lo existente; agrega una capa de **normas** y, según decisión, registros SST/ambientales.

1. **`norms`** — catálogo de normas/sistemas. `id, organization_id, code ('9001'|'14001'|'45001'|custom), name, is_active`. Se **siembra** por organización con 9001/14001/45001 al activarlas; editable para normas propias (p. ej. BASC, NTC 6001).
2. **`entity_norms`** — etiqueta polimórfica. `id, organization_id, norm_id, entity_type ('proceso'|'documento'|'riesgo'|'no_conformidad'|'objetivo'|'requisito_legal'), entity_id`. `unique(norm_id, entity_type, entity_id)`. Permite marcar cualquier registro con una o varias normas, **sin alterar** las tablas existentes. RLS por `organization_id`.
3. **Registros propios** (según decisión de alcance, ver §3):
   - **45001 — Matriz de peligros (SST):** `hazards` (proceso/cargo o área, peligro, clasificación GTC-45, controles existentes, valoración del riesgo —nivel de deficiencia/exposición/consecuencia o una escala simplicada—, nivel de riesgo, medidas de intervención, responsable, estado). Es el registro estrella de SG-SST.
   - **14001 — Aspectos e impactos ambientales:** `env_aspects` (proceso/actividad, aspecto, impacto, condición normal/anormal/emergencia, significancia, control, requisito legal asociado).

## 3. Decisiones de alcance (lo que necesito que decidas)

| Decisión | Opciones | Recomendación |
|---|---|---|
| **A. Alcance del MVP del #4** | (1) **Solo la capa multi-norma** (catálogo + etiquetado + filtros/reportes por norma en los módulos y el Tablero) · (2) multi-norma **+ matriz de peligros SST** · (3) multi-norma + SST + aspectos ambientales | **(2)**: la capa multi-norma **+ la matriz de peligros SST** (lo que de verdad vende en Colombia); **diferir aspectos ambientales** a un v1.1-4b. Hacer las 3 cosas juntas es demasiado para una iteración. |
| **B. Cómo etiquetar por norma** | (1) tabla polimórfica `entity_norms` (sin tocar tablas) · (2) columna `norm_ids uuid[]` en cada tabla | **(1)**: una tabla, cero migraciones destructivas sobre lo existente, fácil de auditar y de extender a nuevas entidades. |
| **C. La matriz de peligros, ¿reutiliza Riesgos o es un módulo propio?** | (1) extender el módulo de **Riesgos** con `kind` (calidad/SST/ambiental) y campos GTC-45 opcionales · (2) **tabla `hazards` propia** con el método GTC-45 | **(2)** tabla propia: la metodología **GTC-45** (deficiencia×exposición×consecuencia) es distinta de la matriz de riesgos de calidad; mezclarlas ensucia ambas. Se liga al mismo proceso y comparte el patrón. |
| **D. Catálogo de normas** | fijo (9001/14001/45001) · editable por org | **Editable** (sembrado con las 3 ISO): permite normas propias sin re-release. |
| **E. Valoración GTC-45** | método completo (ND/NE/NC → NR, niveles I–IV) · escala simplificada | **GTC-45 completo** (es lo que el auditor de SST espera); el cálculo del Nivel de Riesgo se hace **en el servidor** (como Indicadores/Proveedores). |

## 4. Alcance MVP propuesto (si eliges A=2, B=1, C=2, D=editable, E=GTC-45)

| Feature | ¿v1.1-4? | Justificación |
|---|---|---|
| Catálogo `norms` (sembrado 9001/14001/45001; editable) | **Sí** | Base de la multi-norma. |
| Etiquetar por norma (procesos, documentos, riesgos, NC, objetivos, requisitos) vía `entity_norms` | **Sí** | El valor transversal; chips de norma + filtro por norma en esos módulos. |
| **Filtro/segmento por norma** en el Tablero y en los listados | **Sí** | "Ver el SG-SST" de un vistazo. |
| **Matriz de peligros SST** (`hazards`, GTC-45, valoración server-side) con tablero + ficha | **Sí** | Registro estrella de 45001/Dec. 1072. |
| **Aspectos ambientales** (14001) | **No (v1.1-4b)** | Se añade después con su propia auditoría. |
| Panel/relación peligro → control/acción → NC | **No (diferido)** | Se evalúa en uso. |

**Camino dorado:** el admin activa las normas de su organización → el Líder SIG **etiqueta** procesos/documentos/riesgos/objetivos por norma (y filtra el Tablero por "SST") → el responsable de SST levanta la **matriz de peligros** por proceso (peligro, GTC-45 → nivel de riesgo calculado, controles, responsable) → exporta la matriz para la ARL/auditor.

## 5. Mapa de rutas (propuesto)

| Ruta | Qué muestra | Quién |
|---|---|---|
| `/app/admin` (pestaña **Normas**) | activar/crear normas de la organización | Admin / Líder SIG |
| `/app/peligros` (+ficha) | matriz de peligros SST (GTC-45) por proceso | Ver: roles SIG; gestión: Líder SIG / Líder del proceso |
| chips + filtro "Norma" | en procesos, documentos, riesgos, NC, objetivos, requisitos y en el **Tablero** | según cada módulo |

## 6. Integraciones y riesgos

**Integraciones:** `entity_norms` se cruza con los módulos existentes (solo lectura para chips/filtros); tareas+cron (revaluación de peligros), `log_event`, CSV, Tablero (segmento por norma). Sin dependencias nuevas.

**Top 3 riesgos y mitigación:**
1. **Tocar muchos módulos a la vez.** → La capa multi-norma es **aditiva** (`entity_norms`, sin cambiar esquemas); el etiquetado se integra módulo a módulo (chip + filtro), no de golpe; la matriz de peligros es un dominio nuevo aislado.
2. **Metodología SST incorrecta.** → GTC-45 con cálculo del Nivel de Riesgo **en el servidor**, validado; una mala valoración es un hallazgo de auditoría real. Confirmar la tabla de valoración contigo antes de codificar.
3. **Aislamiento multi-tenant.** → `organization_id` + RLS en `norms`/`entity_norms`/`hazards`; `entity_norms` valida que la entidad y la norma sean de la **misma** organización (FKs compuestas).

## Decisiones (ADR, se fijan al aprobar el alcance)
- **ADR-043** — Catálogo `norms` por organización (sembrado ISO, editable) + etiquetado polimórfico `entity_norms` (sin alterar las tablas existentes).
- **ADR-044** — Matriz de peligros SST como **módulo propio** `hazards` con **GTC-45** (Nivel de Riesgo calculado en el servidor); aspectos ambientales 14001 diferidos a v1.1-4b.
- **ADR-045** — Integración por norma en los módulos existentes vía chips + filtro y un **segmento "Norma"** en el Tablero, de forma **aditiva** y módulo a módulo.

## Checklist de salida
- [x] Multi-tenant (org + RLS) reutilizado; capa aditiva.
- [x] Camino dorado de punta a punta.
- [x] Riesgos con mitigación.
- [ ] **Fernando decide A–E y aprueba el alcance antes de pasar a diseño.**
