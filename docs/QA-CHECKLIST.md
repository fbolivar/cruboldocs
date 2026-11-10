# QA-CHECKLIST — CrubolDocs

> Se recorre antes de cada release, después de `npm run check` y `npm run test:e2e:prod` en verde.
> Marca cada ítem en el PR del release. Un ítem en rojo bloquea el deploy.

## 1. Pruebas automáticas (deben estar en verde)

| Suite | Comando | Qué cubre |
|---|---|---|
| Unitarias (Vitest) | `npm test` | Rol × estado de la ficha, permisos, segregación de funciones, riesgo P×I, bandeja, fechas en Bogotá, CSV (inyección de fórmulas), firmas binarias de archivos, redirección segura, filtros de URL, CSP, límites de intentos y Turnstile |
| RLS (PGlite) | `npm run test:rls` | 2 organizaciones, cada rol, flujo del documento, de riesgos, de **no conformidades/CAPA** (ciclo completo, verificación obligatoria, numeración) y de **auditorías internas** (planificar→ejecutar→cerrar, autorización por rol, hallazgo→NC, numeración) y de **indicadores/KPIs** (crear/archivar por rol, captura por líder del proceso dueño, cumplimiento derivado por sentido, medición→NC, numeración) y de **revisión por la dirección** (snapshot con todos los bloques, crear/decisiones/cerrar solo Líder SIG, salida→NC idempotente, cierre firmado admin-only — `authenticated` no ejecuta `close_review` directo —, inmutabilidad tras cerrar, numeración) y de **competencias** (catálogo/perfil por rol; **dato personal**: la persona ve lo suyo y no lo ajeno, la consulta no; estado cumple/brecha calculado en servidor; upsert de evaluación; tarea de cierre; aislamiento entre personas y entre orgs) y de **proveedores** (alta/evaluación por rol; puntaje y resultado calculados en servidor por umbral; estado vigente y próxima reevaluación; baja lógica; numeración PRV-AAAA-###; aislamiento entre orgs), inmutabilidad, Superadmin con `aal2`, invitaciones, recertificación |
| E2E dev (Playwright) | `npm run test:e2e` | Rutas protegidas, login/recuperar (validación y CAPTCHA), invitación inválida, 404, cabeceras, nonce, cron sin secreto; escritorio y móvil |
| E2E producción | `npm run build` y luego `npm run test:e2e:prod` | Lo anterior sobre el build, más HSTS y CSP estricta |
| Todo | `npm run check` | lint + tsc + unitarias + RLS + build (**no correrlo con el dev de 3001 activo**) |

**Sin cobertura automática:** los E2E no inician sesión porque no hay base de pruebas: no hay rama de Supabase (decisión de Fernando, 2026-09-24) y el CAPTCHA protege el login real. El flujo con sesión se prueba a mano en la sección 2.

## 2. Camino dorado manual (con alias de Gmail, en ventanas de incógnito)

Usa una organización de prueba creada por el Superadmin y los alias `fbolivarb+elaborador@`, `+revisor@`, `+aprobador@`, `+lector@`, `+control@`.

1. [ ] **Superadmin** ingresa con MFA y crea la organización de prueba con su Administrador. Llega el correo de invitación.
2. [ ] **Admin** acepta la invitación (acepta la política de datos), crea proceso, tipo, cargos con sus roles e invita a los 5 alias.
3. [ ] **Elaborador** registra un documento (PDF + Word) y lo envía a revisión. Aparece la tarea en la bandeja del revisor y llega el correo.
4. [ ] **Revisor** comenta y devuelve. El elaborador reemplaza el PDF y reenvía. El revisor firma la revisión (pide la contraseña).
5. [ ] **Aprobador** firma la aprobación. El documento queda **Vigente** y el lector recibe *Confirmar lectura*.
6. [ ] **Lector** abre el PDF en el visor y confirma la lectura. El avance de lecturas sube.
7. [ ] **Lector** solicita una actualización. El elaborador la atiende y crea la versión 2 (vuelve al paso 3).
8. [ ] **Líder de proceso** identifica un riesgo, lo valora (inherente y residual) y define un control con responsable.
9. [ ] **Responsable de control** registra la evidencia con archivo. El riesgo muestra la evidencia.
10. [ ] **Admin** (sin rol funcional) abre la ficha: ve metadatos, **no** ve el PDF ni los comentarios.
11. [ ] Exportar la lista maestra y la matriz de riesgos a CSV: abren en Excel con tildes y columnas correctas.

### 2.1 No Conformidades / CAPA (Módulo 1)

> Requiere el agente apagado o encendido es indistinto; sí requiere un usuario con rol **Líder SIG** (o Líder de proceso) y un **cargo responsable** para las acciones. Con el agente/riesgos ya probados, reutiliza los mismos cargos.

12. [ ] **Cualquier miembro** (p. ej. el lector) usa **Reportar no conformidad** (descripción, origen, proceso, severidad): aparece `NC-AAAA-001` en el tablero y un líder la ve.
13. [ ] **Líder SIG** abre la ficha, registra el **análisis de causa** (pasa a *Plan de acción*) y agrega una **acción** (tipo, responsable, plazo) → *En ejecución*; el responsable recibe la tarea en su bandeja.
14. [ ] **Responsable** marca la acción como **hecha** y **adjunta una evidencia** (PDF/imagen ≤25 MB): aparece como enlace de descarga en la acción y el archivo se descarga con URL firmada. Al quedar todas hechas, la NC pasa a **Verificación de eficacia**.
15. [ ] **Líder SIG / dueño** verifica: *No eficaz* la **reabre** (vuelve a Plan, `reopened_count` sube); *Eficaz* la **cierra**. No se puede cerrar sin verificar.
16. [ ] **Anular:** un líder anula una NC con motivo; queda *Anulada* y sus tareas pendientes se cierran.
17. [ ] **Visibilidad/permisos:** un **cargo sin rol SIG** (p. ej. aprobador) no ve el tablero salvo las NC que él reportó; **no** puede gestionar (causa/acciones/verificar). El ítem "No conformidades" solo aparece en el menú para roles del SIG.

### 2.2 Auditorías internas (Módulo 2)

> Requiere un usuario con rol **Líder SIG** (planifica/inicia/cierra) y un cargo con rol **auditor** (registra hallazgos). Reutiliza los cargos del módulo anterior; asigna el rol `auditor` a uno.

18. [ ] **Líder SIG** usa **Planificar auditoría** (título, objetivo/criterios, uno o más procesos, líder auditor, fecha): aparece `AUD-AAAA-001` en el tablero. Si asignó líder auditor, a ese cargo le llega la tarea *Conducir auditoría*.
19. [ ] **Líder SIG** abre la ficha y pulsa **Iniciar auditoría**: el stepper pasa a *En ejecución* y se habilita **Registrar hallazgo**.
20. [ ] **Auditor** registra varios hallazgos de distinto tipo (no conformidad con severidad, observación, oportunidad de mejora, conformidad): aparecen con su badge y, si corresponde, el proceso y el criterio.
21. [ ] **Auditor / Líder SIG** pulsa **Generar no conformidad** en un hallazgo de tipo *no conformidad*: se crea una `NC-AAAA-###` (origen *auditoría interna*), el hallazgo muestra el enlace a la NC y el botón ya no reaparece (idempotente). La NC existe en el Módulo 1.
22. [ ] **Líder SIG** **cierra** la auditoría con conclusiones (no se puede cerrar sin conclusiones): el stepper pasa a *Cerrada* y la tarea del líder auditor se completa.
23. [ ] **Cancelar:** en otra auditoría no cerrada, el Líder SIG la **cancela** con motivo; queda *Cancelada* y sus tareas pendientes se cierran.
24. [ ] **Visibilidad/permisos:** un cargo con rol SIG de solo lectura (p. ej. *consulta*) ve el tablero pero **no** puede planificar/iniciar/registrar/cerrar; un cargo sin ningún rol SIG **no** ve el ítem "Auditorías" en el menú. Solo el **auditor** (o el Líder SIG) registra hallazgos.

### 2.3 Indicadores de gestión / KPIs (Módulo 3)

> Requiere un usuario con rol **Líder SIG** (crea/edita/archiva) y, para probar la captura por proceso, un cargo con rol **líder de proceso** del proceso dueño del indicador.

25. [ ] **Líder SIG** usa **Nuevo indicador** (nombre, proceso, unidad, sentido, meta, frecuencia, responsable): aparece `IND-AAAA-001` en el tablero con estado "Sin medición". Prueba los tres sentidos (mayor/menor/rango → aparece Meta máx) y un indicador de **tasa** (marca la casilla).
26. [ ] **Registrar medición** (Líder SIG o Líder del proceso dueño): el Sheet muestra el **cumplimiento estimado en vivo**; guarda un valor que **cumple**, otro **en riesgo** y otro **no cumple** (en periodos distintos). Para el de tasa, captura numerador/denominador y verifica el valor calculado. La nota es obligatoria si no cumple.
27. [ ] **Tendencia:** la ficha dibuja la gráfica con la línea de meta (o banda en rango) y los puntos coloreados por cumplimiento; la tabla de mediciones coincide. El tablero muestra la mini-tendencia (sparkline) y el badge del último periodo.
28. [ ] **Generar NC** en una medición **no cumple**: se crea una `NC-AAAA-###` (origen *Indicador*), la fila muestra el enlace a la NC y el botón no reaparece (idempotente). La NC existe en el Módulo 1.
29. [ ] **Editar / archivar:** el Líder SIG edita la definición (el histórico conserva su cumplimiento — no se recalcula) y archiva el indicador (sale del tablero activo salvo "Ver archivados"); puede reactivarlo.
30. [ ] **Visibilidad/permisos:** un cargo de solo lectura (*consulta*) ve el tablero pero **no** crea/edita/archivca ni registra; un Líder de proceso solo captura mediciones de **su** proceso; un cargo sin rol SIG **no** ve el ítem "Indicadores" en el menú.

### 2.4 Revisión por la dirección (Módulo 4)

> Requiere un usuario con rol **Líder SIG** (crea/edita/cierra/firma). Para ver bien el snapshot, conviene que la organización ya tenga datos en NC, auditorías, indicadores, riesgos y documentos del periodo.

31. [ ] **Líder SIG** usa **Nueva revisión** (título, periodo inicio/fin, fecha de reunión, alcance): aparece `RD-AAAA-001` en el tablero con estado "Borrador". El acta precarga el **snapshot** (6 tarjetas: NC, auditorías, indicadores, riesgos, documentos, acciones previas) con los números del sistema para ese periodo.
32. [ ] **Actualizar datos del sistema** (solo en borrador) recalcula el snapshot; los `—` aparecen cuando no hay indicadores con medición en el periodo o no hay controles (cumplen %/controles a tiempo sin dato).
33. [ ] **Entradas de texto (9.3.2):** editar las 5 entradas (satisfacción, retroalimentación, proveedores, recursos, mejora) y asistentes/alcance guarda y persiste al recargar.
34. [ ] **Salidas (9.3.3):** **Agregar decisión** de cada tipo (decisión, acción de mejora, recurso, cambio del SGC) con responsable y plazo; aparecen en la lista con su chip. En una **acción de mejora**, **Generar NC** crea una `NC-AAAA-###` (origen *Mejora*), muestra el enlace y no reaparece el botón (idempotente). La NC existe en el Módulo 1.
35. [ ] **Cerrar y firmar:** el Sheet exige **reautenticación con contraseña** (significado visible). Con contraseña incorrecta no cierra. Con la correcta el acta pasa a **Cerrada**, muestra firmante y fecha, y queda **inmutable**: ya no se editan entradas, ni se agregan decisiones, ni se actualiza el snapshot. **Cancelar** (solo en borrador) pide motivo y deja el acta Cancelada.
36. [ ] **Visibilidad/permisos:** un cargo de solo lectura (*consulta*) ve el acta pero **no** crea/edita/cierra; un cargo sin rol SIG **no** ve el ítem "Revisión por la dirección" en el menú.

### 2.5 Competencias y formación (Módulo 5)

> Requiere un usuario con rol **Líder SIG** (gestiona catálogo, perfiles, formación y evaluaciones) y, para el dato personal, probar también con la **propia persona** y con una **consulta**.

37. [ ] **Catálogo:** el Líder SIG crea competencias (`/app/competencias/catalogo`, con tipo educación/formación/habilidad/experiencia). Un cargo **consulta** no puede crearlas.
38. [ ] **Perfil del cargo** (`/app/competencias/cargos/[id]`): agrega requisitos (competencia + nivel 1/2/3 + obligatoria); quitar un requisito lo retira de la vista (baja lógica) y se puede volver a agregar.
39. [ ] **Formación:** registra una formación (`/app/competencias/formacion` o desde la ficha de la persona) con tipo, fecha y horas; en la ficha de la persona queda la fila con su resultado y vencimiento. (El adjunto de certificado está diferido: el stub lo indica.)
40. [ ] **Evaluar competencia** (ficha de persona): el Sheet muestra el **estado derivado en vivo** (cumple/brecha/brecha en plan) según el nivel evaluado vs. el requerido; en **brecha** la nota es obligatoria y puede marcarse **crear tarea de cierre** (aparece en la bandeja del cargo). Reevaluar la misma competencia actualiza la fila (no duplica).
41. [ ] **Matriz** (`/app/competencias`): muestra persona × competencia con el estado y el nivel evaluado/requerido; el resumen muestra **% de cobertura** (solo obligatorias), brechas abiertas y certificados por vencer. Filtros proceso/cargo/estado/buscar.
42. [ ] **Dato personal / visibilidad:** la **propia persona** ve su ficha en **solo lectura** (sin botones de evaluar/registrar); un cargo **consulta** ve la matriz y los perfiles pero **no** las evaluaciones ni la formación de otras personas (aparecen "sin evaluar"); un cargo sin rol SIG **no** ve el ítem "Competencias" en el menú.

### 2.6 Proveedores (Módulo 6)

> Requiere un usuario con rol **Líder SIG** (o Líder del proceso del proveedor). Para la visibilidad, probar también con una **consulta**.

43. [ ] **Registrar proveedor** (`/app/proveedores`, Sheet "Nuevo proveedor": razón social, NIT, tipo, categoría, criticidad, proceso, contacto): aparece `PRV-AAAA-001` con estado **Pendiente**. Una **consulta** no puede registrar.
44. [ ] **Evaluación inicial** (ficha, "Hacer evaluación inicial"): el Sheet muestra el **resultado estimado en vivo** (total/100 y aprobado/condicionado/rechazado) según los 3 criterios con sus pesos; al guardar, el estado vigente pasa a ese resultado y se ve el **medidor de puntaje** y la próxima reevaluación.
45. [ ] **Reevaluar** ("Evaluar / Reevaluar"): una nueva evaluación cambia el estado vigente y se agrega al historial (más reciente primero); la próxima reevaluación se actualiza (realce si vencida).
46. [ ] **Baja / reactivación:** "Dar de baja" deja el proveedor **Inactivo** (sin botón de evaluar); "Reactivar" lo devuelve al resultado de su última evaluación (o Pendiente). **Exportar CSV** descarga la lista visible.
47. [ ] **Visibilidad/permisos:** un cargo **consulta** ve el tablero y la ficha pero **no** registra/edita/evalúa; un cargo sin rol SIG **no** ve el ítem "Proveedores" en el menú.

## 3. Regresión

48. [ ] **Móvil (390 px):** bandeja, lista de documentos, ficha, riesgos, **no conformidades**, **auditorías**, **indicadores**, **revisión por la dirección**, **competencias** (la matriz como lista por persona) y **proveedores** (lista y ficha con el medidor de puntaje) sin desplazamiento horizontal. La barra inferior funciona.
49. [ ] **Estados vacíos:** organización nueva sin documentos, riesgos, no conformidades, auditorías, indicadores, revisiones, competencias ni proveedores (checklist de configuración en Inicio; tableros vacíos; proveedores: sin proveedores y proveedor "pendiente" sin evaluaciones muestran su estado vacío).
50. [ ] **Errores de red:** con la red cortada (DevTools → Offline), una acción muestra el error y no pierde el formulario.
51. [ ] **Recuperar contraseña** en producción: llega el correo, el enlace abre `/restablecer`, y un enlace vencido vuelve a `/recuperar`.
52. [ ] **Límites de intentos:** 9 logins fallidos con el mismo correo muestran "Demasiados intentos".
53. [ ] **Acceso vencido:** un externo con vigencia vencida entra y ve `/sin-acceso`.
54. [ ] **Cron:** `GET /api/cron/diario` con `Authorization: Bearer <CRON_SECRET>` responde 200 y vacía el outbox.

## Historial
- 2026-09-24 — Primera versión (fase testing): 157 unitarias, 160 RLS, 44 E2E en dev + 2 solo de producción.
- 2026-09-25 — Pre-lanzamiento: 167 RLS (anónimo sin privilegios, migración 015) y 48 E2E contra el build (se agrega robots.txt).
- 2026-11-10 — Módulo No Conformidades/CAPA (migraciones 017–018): 171 unitarias, **201 RLS**, E2E con las rutas del módulo; camino dorado manual §2.1.
- 2026-11-10 — Módulo Auditorías internas (migraciones 020–021): 175 unitarias, **218 RLS**, E2E con las rutas del módulo (`/app/auditorias` y la ficha); camino dorado manual §2.2.
- 2026-11-10 — Módulo Indicadores de gestión / KPIs (migración 022): 185 unitarias, **240 RLS**, E2E con las rutas del módulo (`/app/indicadores` y la ficha); camino dorado manual §2.3.
- 2026-11-10 — Módulo Revisión por la dirección (migraciones 023–024): 193 unitarias, **262 RLS** (incluye el endurecimiento MED-01: `authenticated` no ejecuta `close_review` directo), E2E con las rutas del módulo (`/app/revisiones` y la ficha); camino dorado manual §2.4.
- 2026-11-10 — Módulo Competencias y formación (migración 025): 205 unitarias, **281 RLS** (dato personal: la persona ve lo suyo y no lo ajeno; estado cumple/brecha en servidor; upsert; tarea de cierre), E2E con las rutas del módulo (`/app/competencias`, catálogo, formación y ficha de persona); camino dorado manual §2.5.
- 2026-11-10 — Módulo Proveedores (migración 026): 218 unitarias, **296 RLS** (puntaje y resultado calculados en servidor por umbral, estado vigente y próxima reevaluación, baja lógica, numeración PRV-AAAA-###, aislamiento), E2E con las rutas del módulo (`/app/proveedores` y la ficha); camino dorado manual §2.6.
