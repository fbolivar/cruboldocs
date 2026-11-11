# QA-CHECKLIST — CrubolDocs

> Se recorre antes de cada release, después de `npm run check` y `npm run test:e2e:prod` en verde.
> Marca cada ítem en el PR del release. Un ítem en rojo bloquea el deploy.

## 1. Pruebas automáticas (deben estar en verde)

| Suite | Comando | Qué cubre |
|---|---|---|
| Unitarias (Vitest) | `npm test` | Rol × estado de la ficha, permisos, segregación de funciones, riesgo P×I, bandeja, fechas en Bogotá, CSV (inyección de fórmulas), firmas binarias de archivos, redirección segura, filtros de URL, CSP, límites de intentos y Turnstile |
| RLS (PGlite) | `npm run test:rls` | 2 organizaciones, cada rol, flujo del documento, de riesgos, de **no conformidades/CAPA** (ciclo completo, verificación obligatoria, numeración) y de **auditorías internas** (planificar→ejecutar→cerrar, autorización por rol, hallazgo→NC, numeración) y de **indicadores/KPIs** (crear/archivar por rol, captura por líder del proceso dueño, cumplimiento derivado por sentido, medición→NC, numeración) y de **revisión por la dirección** (snapshot con todos los bloques, crear/decisiones/cerrar solo Líder SIG, salida→NC idempotente, cierre firmado admin-only — `authenticated` no ejecuta `close_review` directo —, inmutabilidad tras cerrar, numeración) y de **competencias** (catálogo/perfil por rol; **dato personal**: la persona ve lo suyo y no lo ajeno, la consulta no; estado cumple/brecha calculado en servidor; upsert de evaluación; tarea de cierre; aislamiento entre personas y entre orgs) y de **proveedores** (alta/evaluación por rol; puntaje y resultado calculados en servidor por umbral; estado vigente y próxima reevaluación; baja lógica; numeración PRV-AAAA-###; aislamiento entre orgs) y de **PQRS** (dato personal con RLS por SIG; cierre exige respuesta; reclamo→NC idempotente 'queja_pqrs'; satisfacción 0–100 en servidor, upsert; numeración PQRS-AAAA-###; aislamiento) y de **actas y objetivos/BSC** (crear/editar/cerrar actas y agregar/cumplir compromisos por rol; compromiso→tarea; compromiso se cumple aun con acta cerrada; objetivos con avance derivado de indicadores ligados de la misma org, "Sin datos" si no hay; baja lógica de `objective_indicators`; numeración ACT/OBJ-AAAA-###; aislamiento) y de **encuestas enviables** (envío público por `anon` solo vía RPC validado por token/estado, normalización de escala a 0–100, cierre→medición, `anon` sin lectura de tablas, aislamiento, numeración ENC-AAAA-###) y de **requisitos legales** (crear/evaluar/derogar por rol; cumplimiento vigente derivado de la última evaluación; evidencia obligatoria; baja lógica `derogado` no editable; numeración REQ-AAAA-###; aislamiento) y de **multi-norma/peligros SST** (normas por Admin/Líder SIG; etiquetado polimórfico con baja lógica; peligros GTC-45 con NP/NR/Nivel calculados en servidor; inactivar no editable; aislamiento; numeración PEL-AAAA-###) y de **aspectos ambientales 14001** (significancia derivada en servidor por índice/emergencia/requisito legal; baja lógica; numeración ASP-AAAA-###; aislamiento), inmutabilidad, Superadmin con `aal2`, invitaciones, recertificación |
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

### 2.7 PQRS y satisfacción del cliente (Módulo 7)

> Requiere un usuario con rol **Líder SIG** (o Líder del proceso del caso). Para la visibilidad, probar también con una **consulta**.

48. [ ] **Registrar PQRS** (`/app/pqrs`, Sheet "Nueva PQRS": tipo, canal, cliente —solo nombre+contacto, con aviso de dato personal—, proceso, descripción, fecha): aparece `PQRS-AAAA-001`, estado **Recibida**, vencimiento = recepción **+15 días**. Una **consulta** no puede registrar.
49. [ ] **Gestión y respuesta** (ficha): "Asignar / cambiar estado" asigna responsable/proceso y mueve entre Recibida/En gestión/Resuelta; "Registrar respuesta" guarda la respuesta (pasa a En gestión). El stepper refleja el estado.
50. [ ] **Reclamo → NC:** en una PQRS tipo **reclamo**, "Generar no conformidad" crea una `NC-AAAA-###` (origen *Queja/PQRS*), muestra el enlace y no reaparece el botón (idempotente). En una **petición** no aparece la opción.
51. [ ] **Cierre y anulación:** "Cerrar PQRS" **exige respuesta registrada** y pregunta si el cliente quedó conforme → estado **Cerrada** (solo lectura). "Anular" deja la PQRS **Anulada**. **Exportar CSV** descarga la lista visible.
52. [ ] **Satisfacción:** "Registrar satisfacción" (periodo, método, puntaje 0–100) muestra el **semáforo en vivo** y aparece en el panel y en la tarjeta de resumen (Bien/Medio/Bajo). Reregistrar el mismo periodo+método actualiza (no duplica).
53. [ ] **Visibilidad/permisos:** un cargo **consulta** ve el tablero y la ficha pero **no** gestiona; un cargo sin rol SIG **no** ve el ítem "PQRS" en el menú; el dato del cliente se limita a nombre + contacto.

### 2.8 Actas/reuniones y Objetivos de calidad / BSC (Módulo 8)

> Requiere un usuario con rol **Líder SIG** (o Líder del proceso del acta/objetivo). Para la visibilidad, probar también con una **consulta**. Para los objetivos conviene tener algún **indicador** del Módulo 3 ya con medición.

54. [ ] **Crear acta** (`/app/actas`, Sheet "Nueva acta": título, tipo, fecha —no futura—, asistentes **con aviso de dato personal**, temas, proceso): aparece `ACT-AAAA-001`, estado **Borrador**. Una **consulta** no puede crear.
55. [ ] **Compromiso → tarea** (ficha): "Agregar compromiso" (descripción, responsable, plazo) lo añade y **genera una tarea `cumplir_compromiso`** en la bandeja del cargo responsable. "Marcar cumplido" lo deja **Cumplido** y **completa la tarea**.
56. [ ] **Cerrar y solo lectura:** "Cerrar acta" la deja **Cerrada** (no se edita ni se agregan compromisos), pero un compromiso **pendiente** sigue pudiéndose **marcar cumplido**. Editar solo está disponible en **borrador**. **Exportar CSV** descarga la lista (sin asistentes).
57. [ ] **Crear objetivo** (`/app/objetivos`, Sheet "Nuevo objetivo": descripción, **perspectiva BSC**, proceso, meta, horizonte, **indicadores**): aparece en el bloque de su perspectiva como `OBJ-AAAA-001`, estado **Activo**.
58. [ ] **Avance derivado:** el objetivo muestra el **avance** (semáforo + %) calculado de sus indicadores; un objetivo **sin indicadores** muestra **"Sin datos"** (no 0%). Editar (card → Sheet) **re-sincroniza** los indicadores ligados y permite cambiar el **estado** a Cumplido/No cumplido/Archivado.
59. [ ] **Visibilidad/permisos:** un cargo **consulta** ve ambos tableros pero **no** gestiona; un cargo sin rol SIG **no** ve los ítems "Actas" ni "Objetivos" en el menú; los **asistentes** (dato personal) quedan fuera del CSV y del resumen.

### 2.9 Tablero gerencial (v1.1-1)

> Requiere un usuario con rol **Líder SIG**, **auditor** o **dirección** (gerente/aprobador). Para ver el consolidado conviene tener datos en varios módulos (NC, indicadores con medición, objetivos, PQRS).

60. [ ] **Vista consolidada** (`/app/tablero`): se ven los KPIs por bloque (Mejora/Desempeño/Cliente/Documentos) y los 4 paneles (NC por estado/severidad, indicadores por cumplimiento, objetivos por perspectiva BSC, PQRS+satisfacción). Cada KPI enlaza a su módulo.
61. [ ] **Filtros:** cambiar **Proceso** y **Periodo (año)** recarga los datos (los agregados se recalculan en servidor); un objetivo/indicador de otro proceso deja de contar. El avance BSC usa semáforo o **"Sin datos"**.
62. [ ] **Exportar:** "CSV" de cada panel descarga sus cifras (sin datos personales); "Imprimir / PDF" abre el diálogo con una vista **limpia** (sin menú ni botones) y el encabezado con **organización · periodo · proceso · fecha**.
63. [ ] **Permisos:** un cargo sin rol SIG ni dirección **no** ve el ítem "Tablero" en el menú y `/app/tablero` muestra "No tienes acceso"; los roles acotados ven el tablero según su RLS.

### 2.10 Encuesta de satisfacción enviable (v1.1-2)

> Requiere un usuario con rol **Líder SIG** (o Líder del proceso) para crear/cerrar. El responder es público (sin sesión). Con Turnstile configurado, el envío exige el CAPTCHA.

64. [ ] **Crear campaña** (panel de satisfacción en `/app/pqrs` → "Nueva encuesta": título, método, escala, periodo, proceso): aparece `ENC-AAAA-001` y se muestra el **link**; "Copiar link" funciona.
65. [ ] **Responder (público)**: abrir el link en una ventana **sin sesión** (`/encuesta/[token]`) → se ve el título y el control de puntaje según la escala (0–100 slider / 1–5 estrellas / NPS 0–10), comentario opcional con aviso de privacidad, CAPTCHA y Enviar → "¡Gracias!". El puntaje se normaliza a 0–100.
66. [ ] **Avance y cierre**: el panel muestra **nº de respuestas y promedio en vivo**; "Cerrar" (confirma) registra el promedio como **medición de satisfacción** del periodo (se ve en el panel y en el **Tablero**). No se cierra sin respuestas. "CSV" descarga puntajes y comentarios.
67. [ ] **Seguridad del link**: un token inexistente o una campaña cerrada muestran "Esta encuesta no está disponible" (mensaje neutro); el responder nunca pide iniciar sesión; las respuestas son **anónimas** (no se pide identidad).

### 2.11 Requisitos legales (v1.1-3)

> Requiere un usuario con rol **Líder SIG** (o Líder del proceso). Para la visibilidad, probar también con una **consulta**.

68. [ ] **Registrar requisito** (`/app/requisitos-legales` → "Nuevo requisito": título, fuente, referencia legal, qué exige, proceso, frecuencia, URL): aparece `REQ-AAAA-001`, estado **No evaluado**; navega a la ficha. Una **consulta** no puede crear.
69. [ ] **Evaluar** (ficha → "Evaluar": cumple/parcial/no cumple + **evidencia obligatoria** + fecha): el cumplimiento vigente cambia al de la última evaluación y la **próxima evaluación** se fija según la frecuencia (realce si vencida). El historial lista las evaluaciones.
70. [ ] **Derogar y matriz**: "Derogar" (confirma) deja el requisito **Derogado** (solo lectura, oculto por defecto; "Mostrar derogados" lo revela). Los filtros (fuente/cumplimiento/proceso/vencimiento) funcionan. **Exportar CSV** descarga la matriz legal.
71. [ ] **Permisos**: un cargo **consulta** ve la matriz y la ficha pero **no** gestiona; un cargo sin rol SIG **no** ve el ítem "Requisitos legales" en el menú.

### 2.12 Multi-norma y peligros SST / GTC-45 (v1.1-4)

> Requiere **Líder SIG** (o Admin para el catálogo de normas; Líder del proceso para peligros). Para la visibilidad, probar con una **consulta**.

72. [ ] **Catálogo de normas** (Admin → **Normas**): "+ ISO 45001/14001/9001" activa la norma; "Nueva norma" crea una propia (BASC…); el toggle activa/desactiva. Una **consulta** no ve la pestaña ni administra.
73. [ ] **Registrar peligro** (`/app/peligros` → "Nuevo peligro": peligro, clasificación, proceso/área, controles, **ND/NE/NC**): el formulario muestra **NP/NR/Nivel en vivo**; al guardar aparece `PEL-AAAA-001` con el **RiskLevelBadge** correcto (el NR lo calcula el servidor). Una **consulta** no puede crear.
74. [ ] **Ficha de peligro**: muestra la valoración GTC-45 (ND/NE/NC → NP/NR/Nivel + interpretación), controles y medidas; "Editar" recalcula; "Inactivar" lo deja en solo lectura (oculto por defecto; "Mostrar inactivos"). **Exportar CSV** descarga la matriz. Filtros proceso/clasificación/nivel funcionan.
75. [ ] **Permisos/menú**: un cargo sin rol SIG **no** ve "Peligros SST"; la matriz respeta la RLS por organización. **Cableado multi-norma COMPLETO:** chips/etiquetado (`NormCell`) en Procesos, Requisitos, Documentos, Riesgos, No conformidades y Objetivos; segmento "Norma" en el Tablero (acota por procesos etiquetados).

### 2.13 Aspectos ambientales / 14001 (v1.1-4b)

> Requiere **Líder SIG** (o Líder del proceso). Para la visibilidad, probar con una **consulta**.

76. [ ] **Registrar aspecto** (`/app/aspectos-ambientales` → "Nuevo aspecto": actividad, aspecto, impacto, condición, proceso, controles, requisito legal, **4 criterios 1–3**): el formulario muestra **índice y significancia en vivo**; al guardar aparece `ASP-AAAA-001` con el **SignificanceBadge** correcto (el servidor calcula). Una **consulta** no puede crear.
77. [ ] **Significancia derivada**: índice ≥ 8 **o** condición **emergencia** **o** con **requisito legal** ⇒ *Significativo* (verificar un caso de cada uno). "Editar" recalcula; "Inactivar" lo deja en solo lectura (oculto por defecto). **Exportar CSV** descarga la matriz ambiental.
78. [ ] **Enlaces**: la ficha enlaza al **requisito legal** y muestra la etiqueta **14001** (`NormCell`); filtros condición/significancia/proceso funcionan.
79. [ ] **Permisos/menú**: un cargo sin rol SIG **no** ve "Aspectos ambientales"; respeta la RLS por organización.

### 2.14 Constructor de formularios (v1.1-5)

> Gestionar (crear/diseñar/publicar) requiere **Líder SIG** (o Líder del proceso). **Diligenciar** lo puede cualquier **miembro activo**. Ver = roles del SIG.

80. [ ] **Crear y diseñar** (`/app/formularios` → "Nueva plantilla": título, categoría, proceso, descripción → "Crear y diseñar"): nace `FORM-AAAA-001` en **borrador v1** y abre el **diseñador**. Añadir campos desde la paleta (los 9 tipos); editar etiqueta/ayuda/requerido; en selección/multiselección, **opciones**; en número/puntaje, **mín/máx**. Reordenar con **↑/↓**. Eliminar un campo.
81. [ ] **Publicar y versionar**: "Publicar" exige **≥1 campo de dato** y congela la versión (el diseñador queda en solo lectura; muestra "Nueva versión"). "Nueva versión" clona los campos en un **borrador v2** editable sin afectar lo publicado.
82. [ ] **Diligenciar** (`/app/formularios/FORM-…/responder`, como un **miembro no-SIG**): se renderiza el formulario de la versión publicada; **requeridos, opciones y rangos se validan en el servidor** (forzar un requerido vacío, una opción inválida y un número fuera de rango → error). "Guardar borrador" conserva lo capturado; "Enviar" muestra "Respuesta enviada".
83. [ ] **Ficha y respuestas** (`/app/formularios/FORM-…`): lista de respuestas (fecha, quién, versión, estado); "Ver" abre la respuesta en solo lectura; **"Exportar CSV"** = una fila por respuesta enviada (multiselección separada por "; "). "Estructura" muestra los campos de la versión. Una plantilla en **borrador** indica "Publica la plantilla para empezar a recolectar".
84. [ ] **Permisos/menú**: un cargo sin rol SIG **no** ve "Formularios" en el menú pero **sí** puede diligenciar una plantilla publicada por enlace; "Archivar" la oculta (toggle "Mostrar archivadas"); respeta la RLS por organización.

### 2.15 SG-SST · Estándares Mínimos (Res. 0312) (v1.2-2)

> Ver = roles del SIG; crear/diligenciar/cerrar = Líder SIG o Líder de proceso.

85. [ ] **Nueva autoevaluación** (`/app/sg-sst` → "Nueva autoevaluación": período, nº de trabajadores, clase de riesgo): el Sheet muestra en vivo el **nivel aplicable** (7/21/60); al crear aparece `SGSST-AAAA-001` y abre la ficha con los estándares de ese nivel. Verificar que **5 trab./riesgo II → 7**, **30/II → 21**, **60/III → 60** y **riesgo IV → 60**.
86. [ ] **Diligenciar y puntaje**: marcar estándares **Cumple / No cumple / No aplica** (con justificación obligatoria en No aplica); el **puntaje y la valoración** (semáforo) se **recalculan** al marcar (server-side). El puntaje por fase PHVA se actualiza. **Cerrar** exige todos respondidos y deja la ficha en solo lectura. **Exportar CSV** descarga un renglón por estándar.
87. [ ] **Plan de mejoramiento**: por cada estándar **No cumple**, "+ Acción" (descripción, responsable, plazo); cambiar su estado; el enlace a **Peligros/GTC-45** aparece en el componente de peligros.
88. [ ] **Permisos/menú**: un cargo sin rol SIG **no** ve "SG-SST"; una **consulta** ve pero no crea; respeta la RLS por organización. (Nota interna: los pesos de los niveles 7/21 son provisionales hasta cargar el Anexo oficial; el nivel 60 es exacto.)

## 3. Regresión

89. [ ] **Móvil (390 px):** bandeja, documentos, riesgos, **no conformidades**, **auditorías**, **indicadores**, **revisión**, **competencias**, **proveedores**, **PQRS**, **actas**, **objetivos**, **tablero**, **encuesta pública**, **requisitos legales**, **peligros SST**, **aspectos ambientales**, **formularios** y **SG-SST** (tablero y ficha con el acordeón PHVA) sin desplazamiento horizontal. La barra inferior funciona.
90. [ ] **Estados vacíos:** organización nueva sin registros en cada módulo (EmptyState; objetivo sin indicadores → "Sin datos"; tablero → "Aún no hay datos del SGC"; satisfacción sin campañas; sin requisitos; sin peligros; **sin aspectos**; sin normas activas).
91. [ ] **Errores de red:** con la red cortada (DevTools → Offline), una acción muestra el error y no pierde el formulario.
92. [ ] **Recuperar contraseña** en producción: llega el correo, el enlace abre `/restablecer`, y un enlace vencido vuelve a `/recuperar`.
93. [ ] **Límites de intentos:** 9 logins fallidos con el mismo correo muestran "Demasiados intentos".
94. [ ] **Acceso vencido:** un externo con vigencia vencida entra y ve `/sin-acceso`.
95. [ ] **Cron:** `GET /api/cron/diario` con `Authorization: Bearer <CRON_SECRET>` responde 200 y vacía el outbox.

## Historial
- 2026-09-24 — Primera versión (fase testing): 157 unitarias, 160 RLS, 44 E2E en dev + 2 solo de producción.
- 2026-09-25 — Pre-lanzamiento: 167 RLS (anónimo sin privilegios, migración 015) y 48 E2E contra el build (se agrega robots.txt).
- 2026-11-10 — Módulo No Conformidades/CAPA (migraciones 017–018): 171 unitarias, **201 RLS**, E2E con las rutas del módulo; camino dorado manual §2.1.
- 2026-11-10 — Módulo Auditorías internas (migraciones 020–021): 175 unitarias, **218 RLS**, E2E con las rutas del módulo (`/app/auditorias` y la ficha); camino dorado manual §2.2.
- 2026-11-10 — Módulo Indicadores de gestión / KPIs (migración 022): 185 unitarias, **240 RLS**, E2E con las rutas del módulo (`/app/indicadores` y la ficha); camino dorado manual §2.3.
- 2026-11-10 — Módulo Revisión por la dirección (migraciones 023–024): 193 unitarias, **262 RLS** (incluye el endurecimiento MED-01: `authenticated` no ejecuta `close_review` directo), E2E con las rutas del módulo (`/app/revisiones` y la ficha); camino dorado manual §2.4.
- 2026-11-10 — Módulo Competencias y formación (migración 025): 205 unitarias, **281 RLS** (dato personal: la persona ve lo suyo y no lo ajeno; estado cumple/brecha en servidor; upsert; tarea de cierre), E2E con las rutas del módulo (`/app/competencias`, catálogo, formación y ficha de persona); camino dorado manual §2.5.
- 2026-11-10 — Módulo Proveedores (migración 026): 218 unitarias, **296 RLS** (puntaje y resultado calculados en servidor por umbral, estado vigente y próxima reevaluación, baja lógica, numeración PRV-AAAA-###, aislamiento), E2E con las rutas del módulo (`/app/proveedores` y la ficha); camino dorado manual §2.6.
- 2026-11-10 — Módulo PQRS y satisfacción (migración 027): 228 unitarias, **314 RLS** (dato personal por rol SIG, cierre exige respuesta, reclamo→NC idempotente 'queja_pqrs', satisfacción 0–100/upsert, numeración PQRS-AAAA-###, aislamiento), E2E con las rutas del módulo (`/app/pqrs` y la ficha); camino dorado manual §2.7.
- 2026-11-10 — Módulo Actas/reuniones y Objetivos de calidad/BSC (migración 028): 237 unitarias, **341 RLS** (actas y compromisos por rol, compromiso→tarea, compromiso se cumple aun con acta cerrada, objetivos con avance derivado de indicadores de la misma org y "Sin datos" sin indicadores, baja lógica de `objective_indicators`, numeración ACT/OBJ-AAAA-###, aislamiento), E2E con las rutas del módulo (`/app/actas` +ficha y `/app/objetivos`); camino dorado manual §2.8. **Cierre de la suite ISO 9001 (módulos 1–8).**
- 2026-11-10 — v1.1-1 Tablero gerencial (sin migración; módulo de solo lectura): E2E `/app/tablero` protegida sin sesión; aislamiento heredado de la RLS de las 8 tablas (sin objetos nuevos); camino dorado manual §2.9 (filtros proceso/año, CSV por panel, Imprimir/PDF). Seguridad **APTO** (`AUD-20261110-tablero.md`). Sin unitarias nuevas (el tablero es DB-bound; su dataviz reutiliza helpers ya probados).
- 2026-11-11 — v1.2-2 SG-SST / Estándares Mínimos (Res. 0312) (migración 035): 237 unitarias, **457 RLS** (catálogo nacional 60 estándares con niveles 7/21/60 que suman 100; nivel derivado por tamaño+riesgo; **puntaje y valoración server-side** verificados end-to-end: cumple suma, no_aplica justificado suma, no_cumple no suma, <60→crítico; no_aplica exige justificación; cerrar exige todo respondido; plan de mejora solo para No cumple; aislamiento; `sst_counters` deny-all; catálogo público), E2E de rutas (`/app/sg-sst` + ficha); camino dorado manual §2.15. Seguridad **APTO** (`AUD-20261111-sg-sst.md`, 2 Bajos + COND-01: pesos de niveles 7/21 provisionales, nivel 60 exacto). **Pendiente antes de activar 7/21: cargar pesos oficiales del Anexo.**
- 2026-11-11 — v1.1-5 Constructor de formularios (migración 033): 237 unitarias, **429 RLS** (numeración FORM-AAAA-###; crear/publicar/versionar por rol; publicada inmutable sin nueva versión; `new_version` clona los campos; **validación server-side de respuestas**: requeridos/tipos/opciones/cotas; borrador privado del autor; `get_published_form_by_code` deja diligenciar a cualquier miembro vía definer; aislamiento; `form_counters` deny-all), E2E de rutas (`/app/formularios`, ficha, diseñar, responder); camino dorado manual §2.14. Seguridad **APTO** (`AUD-20261111-formularios.md`, 2 Bajos aceptados; anon sigue en 2).
- 2026-11-10 — v1.1-4b Aspectos ambientales 14001 (migración 032): 237 unitarias, **405 RLS** (significancia derivada en servidor: índice≥8 o emergencia o requisito legal; criterios 1–3 validados; baja lógica inactivo no editable; aislamiento; numeración ASP-AAAA-###; etiqueta 14001 vía entity_norms), E2E de rutas (`/app/aspectos-ambientales` +ficha); camino dorado manual §2.13. Seguridad **APTO** (`AUD-20261110-ambiental.md`). También: cableado multi-norma COMPLETO (batch 1+2: 6 módulos + segmento del Tablero).
- 2026-11-10 — v1.1-4 Multi-norma y peligros SST/GTC-45 (migración 031): 237 unitarias, **393 RLS** (normas por Admin/Líder SIG; etiquetado polimórfico `entity_norms` con baja lógica; peligros GTC-45 con NP/NR/Nivel calculados en servidor y factores validados; inactivar no editable; aislamiento; numeración PEL-AAAA-###), E2E de rutas (`/app/peligros` +ficha); camino dorado manual §2.12. Seguridad **APTO** (`AUD-20261110-multinorma.md`; anon sigue en 2 = solo encuesta). Catálogo de Normas (Admin) + módulo Peligros + infra de etiquetado (NormChip/NormPicker/NormTagger); cableado de chips/filtros por módulo y segmento del Tablero = incremento siguiente (ADR-045).
- 2026-11-10 — v1.1-3 Requisitos legales (migración 030): 237 unitarias, **375 RLS** (crear/evaluar/derogar por rol; cumplimiento vigente derivado; evidencia obligatoria; `next_eval_date` +frecuencia; derogado no editable/evaluable; aislamiento; numeración REQ-AAAA-###), E2E de rutas (`/app/requisitos-legales` +ficha); camino dorado manual §2.11. Seguridad **APTO** (`AUD-20261110-requisitos-legales.md`).
- 2026-11-10 — v1.1-2 Encuesta de satisfacción enviable (migración 029): 237 unitarias, **360 RLS** (envío público por `anon` solo vía RPC validado por token/estado; normalización de escala 1–5/NPS a 0–100; cierre→medición promedio; `anon` sin lectura de tablas = permission denied; aislamiento; numeración ENC-AAAA-###), E2E de la encuesta pública (token inválido → mensaje neutro, sin pedir sesión) y de rutas; camino dorado manual §2.10. Seguridad **APTO** (`AUD-20261110-encuesta.md`; los 2 WARN `anon_security_definer` son el endpoint público por diseño, ADR-039).
