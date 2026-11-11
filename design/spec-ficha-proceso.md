# Design Spec — Ficha de proceso (`/app/procesos/[codigo]`)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/procesos/ARQUITECTURA.md (v1.3-2) + ADR-063/064/065.

## 1. Propósito y protagonista
- **Qué logra:** **caracterizar** el proceso (4.4) y ver, en un solo lugar, todo lo que cuelga de él.
- **Protagonista:** la **caracterización** (objetivo, entradas/salidas, PHVA) del proceso.
- **Roles:** edita caracterización = Líder SIG o Líder del proceso (`canManageProcess`); el resto del SIG, solo lectura.

## 2. Wireframe (escritorio)
```
‹ Procesos
SGC · Gestión de Calidad          [ Estratégico ]  Líder: Coord. Calidad   [ Caracterizar ]

CARACTERIZACIÓN (4.4)
┌──────────────────────────────────────────────────────────────────────┐
│ Objetivo    Asegurar la conformidad del SGC…                          │
│ Alcance     Todos los procesos certificados                           │
│ Entradas    Requisitos ISO · Proveedores: Dirección                   │
│ Salidas     SGC mantenido · Clientes: todos los procesos              │
│ Recursos    Plataforma, auditor interno                               │
│ PHVA        P: planear auditorías · H: ejecutarlas · V: … · A: …      │
└──────────────────────────────────────────────────────────────────────┘

LIGADO A ESTE PROCESO
┌ Indicadores 3 →┐ ┌ Riesgos 2 →┐ ┌ Documentos 5 →┐ ┌ Objetivos 1 →┐
┌ Req. legales 2 →┐ ┌ Partes 1 →┐ ┌ Cuestiones 3 →┐
```

## 3. Secciones
- **Encabezado:** "‹ Procesos"; código, nombre, `Chip` de **tipo**, **líder**; acción **"Caracterizar"** (Sheet, si gestiona).
- **Caracterización (4.4):** objetivo, alcance, entradas, proveedores, salidas, clientes, recursos y **PHVA** (4 líneas: Planear/Hacer/Verificar/Actuar). Si aún no se caracteriza: `EmptyState` "Este proceso no tiene caracterización" + "Caracterizar" (si gestiona). **Sheet "Caracterizar":** un campo por atributo (Textarea para objetivo/alcance/entradas/salidas/recursos y los 4 del PHVA; Input corto para proveedores/clientes). Guardar → toast + `router.refresh()`.
- **Ligado a este proceso:** fila de tarjetas-contador, una por módulo (Indicadores, Riesgos, Documentos, Objetivos, Requisitos legales, Partes interesadas, Cuestiones del contexto), cada una con su **conteo** y enlace a la pantalla del módulo filtrada/relacionada. Si un conteo es 0, la tarjeta se muestra atenuada con "0". Respetan la RLS de cada módulo (si el usuario no ve riesgos, esa tarjeta no aparece).
- **(Opcional) Exportar** la caracterización (CSV).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Skeleton: encabezado + bloque de caracterización + tarjetas. |
| Sin caracterizar | `EmptyState` en la sección + "Caracterizar" (si gestiona). |
| Solo lectura (no gestiona) | Ve la caracterización y los contadores; sin "Caracterizar". |
| Proceso inexistente | `notFound()`. |
| Error / Éxito | `SectionError` + reintentar; toast + refresh. |

## 5. Accesibilidad
- Tipo por `Chip` con texto; campos del Sheet con `label`; las tarjetas-contador son `<Link>` con texto ("Indicadores: 3").

## 6. Móvil (≤640px)
- Una columna; caracterización como lista de pares etiqueta/valor; tarjetas-contador apiladas 2 por fila; Sheet a pantalla completa.

## 7. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Card, Chip, Button, Sheet, Textarea, Input, Label, EmptyState, SectionError | Reutilizados | |
| **CharacterizationCard** + **CharacterizeSheet** | Nuevo | mostrar/editar la caracterización |
| **LinkedCountCard** | Nuevo | tarjeta-contador por módulo |

## 8. Decisiones
- **Caracterización como pares etiqueta/valor** (no formulario rígido SIPOC): legible y suficiente para 4.4; el PHVA en 4 líneas evita una tabla pesada.
- **Contadores con enlace** materializan la integración del SGC alrededor del proceso (ADR-064) sin duplicar datos.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
