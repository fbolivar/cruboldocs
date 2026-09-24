# Design Spec — Shell de la app (layout de `/app/*`)

**Producto:** CrubolDocs · **Fecha:** 2026-09-23 · **Tokens:** design/tokens.md v1

## 1. Propósito y protagonista

- **Qué logra el usuario aquí:** moverse entre las 5 pantallas y ver siempre cuántas tareas tiene pendientes.
- **Protagonista:** el contenido de la pantalla activa (el shell es marco, no compite).
- **Acción primaria:** ninguna propia; el contador de la bandeja es el único dato vivo del shell.

## 2. Wireframe textual (escritorio ≥1024px)

```
┌──────────────┬───────────────────────────────────────────────────────┐
│ ⬡ CrubolDocs │ Topbar: breadcrumb (Documentos / PR-GC-003)   [🔍 Buscar código o título]  [Org ▾] [Avatar ▾] │
│ Org Acme SAS ├───────────────────────────────────────────────────────┤
│              │                                                       │
│ ▣ Inicio  (7)│   <contenido de la pantalla, máx 1280px, gutter 32>   │
│ ▤ Documentos │                                                       │
│ ◬ Riesgos    │                                                       │
│ ─────────    │                                                       │
│ ⚙ Administr. │                                                       │
│              │                                                       │
│ [« Colapsar] │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

- **Sidebar** (240px, colapsable a 64px solo íconos; `superficie`, borde derecho `borde`): logo hexagonal + nombre del producto (h3 display), debajo el nombre de la organización (`small`, `texto-sec`). Ítems: Inicio (con contador de tareas, badge `acento` texto blanco), Documentos, Riesgos, separador, Administración. Ítem activo: fondo `acento-suave`, texto `acento`, barra izquierda 3px `acento`. Solo se muestran los ítems que el rol permite (Riesgos oculto si no hay rol de riesgos; Administración solo Admin org, Líder SIG, Auditor, Superadmin).
- **Topbar** (56px, `superficie`, borde inferior): breadcrumb (`small`, último nivel `texto`); buscador global de documentos por código o título (abre resultados en un popover, `sombra-md`); selector de organización **solo** si el usuario pertenece a más de una (o es Superadmin); menú de avatar: nombre, cargo, correo, "Cerrar sesión".
- **Contenido:** fondo `fondo`, máx. 1280px centrado; full-width en la lista maestra y la matriz de riesgos.

## 3. Comportamiento móvil (<768px)

> **Corte móvil/escritorio = 768px** (breakpoint `md` de Tailwind), decidido por Fernando el 2026-09-23. Aplica a todas las specs: donde dicen "móvil (≤640px)", léase "<768px".

- Sidebar se reemplaza por **barra inferior fija** (56px + safe-area) con 4 ítems: Inicio (con contador), Documentos, Riesgos, Más (abre hoja con Administración y cuenta).
- Topbar: logo hexagonal + título de la pantalla; el buscador se vuelve un ícono que abre una capa a pantalla completa. Breadcrumb se reduce a "‹ Volver".
- Gutter 16. Tablet (768–1023): sidebar visible; el usuario puede colapsarlo a 64px.

## 4. Estados

| Estado | Comportamiento |
|---|---|
| Carga | Shell renderiza de inmediato (server); el contador de tareas muestra skeleton circular de 20px. |
| Vacío | Contador de tareas oculto si es 0 (no "0"). |
| Error | Si falla la sesión o la membresía no está vigente → redirige a `/login` con mensaje "Tu acceso a esta organización venció o fue revocado. Contacta al administrador." |
| Éxito | Toasts globales: esquina inferior derecha (escritorio) / superior (móvil), 4 s, máx. 3 apilados. |

## 5. Componentes involucrados

| Componente | ¿Existe o es nuevo? | Notas |
|---|---|---|
| AppSidebar | Nuevo | Colapsable, estado en cookie |
| Topbar + Breadcrumb | Nuevo (breadcrumb de shadcn) | |
| GlobalSearch | Nuevo (Command de shadcn) | Busca solo lo que RLS permite |
| MobileTabBar | Nuevo | |
| LogoHex | Nuevo | SVG hexágono abierto, gradiente de marca solo aquí |
| Toaster | shadcn (sonner) | |

## 6. Decisiones y porqués

- 4 ítems de navegación, no 5: la ficha del documento es un detalle, no un destino.
- Contador en Inicio: la bandeja es la fuente de verdad (ADR-003); el shell la recuerda en todas partes.
- Ítems ocultos por rol en vez de deshabilitados: evita ruido para el personal de consulta.
- Sin modo oscuro ni selector de tema en v1.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
