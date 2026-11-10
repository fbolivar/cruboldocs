# QA-CHECKLIST — CrubolDocs

> Se recorre antes de cada release, después de `npm run check` y `npm run test:e2e:prod` en verde.
> Marca cada ítem en el PR del release. Un ítem en rojo bloquea el deploy.

## 1. Pruebas automáticas (deben estar en verde)

| Suite | Comando | Qué cubre |
|---|---|---|
| Unitarias (Vitest) | `npm test` | Rol × estado de la ficha, permisos, segregación de funciones, riesgo P×I, bandeja, fechas en Bogotá, CSV (inyección de fórmulas), firmas binarias de archivos, redirección segura, filtros de URL, CSP, límites de intentos y Turnstile |
| RLS (PGlite) | `npm run test:rls` | 2 organizaciones, cada rol, flujo del documento, de riesgos, de **no conformidades/CAPA** (ciclo completo, verificación obligatoria, numeración) y de **auditorías internas** (planificar→ejecutar→cerrar, autorización por rol, hallazgo→NC, numeración), inmutabilidad, Superadmin con `aal2`, invitaciones, recertificación |
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

## 3. Regresión

25. [ ] **Móvil (390 px):** bandeja, lista de documentos, ficha, riesgos, **no conformidades** y **auditorías** (tablero y ficha) sin desplazamiento horizontal. La barra inferior funciona.
26. [ ] **Estados vacíos:** organización nueva sin documentos, riesgos, no conformidades ni auditorías (checklist de configuración en Inicio; tableros vacíos de NC y de auditorías).
27. [ ] **Errores de red:** con la red cortada (DevTools → Offline), una acción muestra el error y no pierde el formulario.
28. [ ] **Recuperar contraseña** en producción: llega el correo, el enlace abre `/restablecer`, y un enlace vencido vuelve a `/recuperar`.
29. [ ] **Límites de intentos:** 9 logins fallidos con el mismo correo muestran "Demasiados intentos".
30. [ ] **Acceso vencido:** un externo con vigencia vencida entra y ve `/sin-acceso`.
31. [ ] **Cron:** `GET /api/cron/diario` con `Authorization: Bearer <CRON_SECRET>` responde 200 y vacía el outbox.

## Historial
- 2026-09-24 — Primera versión (fase testing): 157 unitarias, 160 RLS, 44 E2E en dev + 2 solo de producción.
- 2026-09-25 — Pre-lanzamiento: 167 RLS (anónimo sin privilegios, migración 015) y 48 E2E contra el build (se agrega robots.txt).
- 2026-11-10 — Módulo No Conformidades/CAPA (migraciones 017–018): 171 unitarias, **201 RLS**, E2E con las rutas del módulo; camino dorado manual §2.1.
- 2026-11-10 — Módulo Auditorías internas (migraciones 020–021): 175 unitarias, **218 RLS**, E2E con las rutas del módulo (`/app/auditorias` y la ficha); camino dorado manual §2.2.
