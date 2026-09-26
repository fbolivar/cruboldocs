# QA-CHECKLIST — CrubolDocs

> Se recorre antes de cada release, después de `npm run check` y `npm run test:e2e:prod` en verde.
> Marca cada ítem en el PR del release. Un ítem en rojo bloquea el deploy.

## 1. Pruebas automáticas (deben estar en verde)

| Suite | Comando | Qué cubre |
|---|---|---|
| Unitarias (Vitest) | `npm test` | Rol × estado de la ficha, permisos, segregación de funciones, riesgo P×I, bandeja, fechas en Bogotá, CSV (inyección de fórmulas), firmas binarias de archivos, redirección segura, filtros de URL, CSP, límites de intentos y Turnstile |
| RLS (PGlite) | `npm run test:rls` | 2 organizaciones, cada rol, flujo del documento y de riesgos, inmutabilidad, Superadmin con `aal2`, invitaciones, recertificación |
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

## 3. Regresión

12. [ ] **Móvil (390 px):** bandeja, lista de documentos, ficha y riesgos sin desplazamiento horizontal. La barra inferior funciona.
13. [ ] **Estados vacíos:** organización nueva sin documentos ni riesgos (checklist de configuración en Inicio).
14. [ ] **Errores de red:** con la red cortada (DevTools → Offline), una acción muestra el error y no pierde el formulario.
15. [ ] **Recuperar contraseña** en producción: llega el correo, el enlace abre `/restablecer`, y un enlace vencido vuelve a `/recuperar`.
16. [ ] **Límites de intentos:** 9 logins fallidos con el mismo correo muestran "Demasiados intentos".
17. [ ] **Acceso vencido:** un externo con vigencia vencida entra y ve `/sin-acceso`.
18. [ ] **Cron:** `GET /api/cron/diario` con `Authorization: Bearer <CRON_SECRET>` responde 200 y vacía el outbox.

## Historial
- 2026-09-24 — Primera versión (fase testing): 157 unitarias, 160 RLS, 44 E2E en dev + 2 solo de producción.
- 2026-09-25 — Pre-lanzamiento: 167 RLS (anónimo sin privilegios, migración 015) y 48 E2E contra el build (se agrega robots.txt).
