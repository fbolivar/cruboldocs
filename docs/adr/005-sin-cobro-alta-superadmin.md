# ADR-005 — Sin cobro en v1 y alta de organizaciones por Superadmin

**Contexto.** El stack incluye Stripe, pero la v1 es una prueba de concepto con un cliente piloto.

**Decisión.** Sin Stripe, landing, `/precios` ni `/registro`. El Superadmin crea las organizaciones y su Administrador; los usuarios entran por invitación.

**Consecuencias.** MVP más corto y superficie de ataque menor (sin autoregistro). El cobro (por organización o por usuario) se decide antes de comercializar y entra como feature propio.
