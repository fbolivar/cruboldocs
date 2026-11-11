# ADR-035 — Tablero gerencial: ruta propia y lectura en vivo con RLS

## Contexto
La dirección y el Líder SIG necesitan una vista consolidada del SGC (entrada natural a la Revisión por la dirección, 9.3). Inicio (`/app`) ya tiene widgets operativos (tareas del cargo, pendientes); recargarlo con la vista gerencial lo volvería confuso. Hay que decidir ruta, visibilidad, y si los datos se leen en vivo o se precalculan.

## Decisión
Nueva ruta **`/app/tablero`** (ítem «Tablero» en el menú), separada de Inicio, **de solo lectura**, que **lee en vivo** reutilizando las funciones de resumen de `src/lib/data/queries.ts` con el cliente del usuario (`scope().supabase`) — la **RLS existente** acota por `organization_id`, sin `service_role` ni caché de datos sensibles. Visible a **Líder SIG, auditor y dirección** (gerente/aprobador) vía `canSeeDashboard`; otros roles del SIG lo ven acotado a lo que su RLS ya permite. Quedan **fuera del MVP**: snapshot/caché, dashboards configurables y el **resumen por IA** (Crubol-Agent), este último porque enviar datos a la IA exige la re-auditoría de seguridad ya acordada.

## Consecuencias
- Cero dominio nuevo, cero migración, cero RLS nueva: el aislamiento se hereda de las tablas de los 8 módulos.
- Separar Tablero de Inicio mantiene cada vista con un propósito (gerencial vs. operativo).
- Si el volumen crece, se podrá añadir caché/snapshot por organización como ampliación, sin cambiar la ruta.
