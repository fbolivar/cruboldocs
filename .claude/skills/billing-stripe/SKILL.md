---
name: billing-stripe
description: Suscripciones y pagos para SaaS con Stripe (checkout, portal, webhooks, planes) y notas para Colombia (Wompi/Mercado Pago). Usar al implementar cobro, planes o cualquier flujo de pago.
---

# Billing con Stripe

## Modelo por defecto
- Suscripción mensual por organización (no por usuario, salvo decisión explícita).
- Planes: Free (limitado) → Pro → Business. Los límites viven en una tabla `plans` y se validan en el servidor.
- Tabla `subscriptions`: `organization_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end`.

## Implementación
1. **Productos y precios** se crean en el dashboard de Stripe (modo test primero); los `price_id` van en variables de entorno.
2. **Checkout**: server action que crea una Checkout Session (`mode: subscription`) con `client_reference_id = organization_id` y redirige. Nunca montar tarjetas propias: siempre Stripe Checkout.
3. **Portal de cliente**: botón "Administrar suscripción" → Billing Portal de Stripe (upgrades, cancelaciones, facturas). No reimplementar eso a mano.
4. **Webhook** `app/api/webhooks/stripe/route.ts`:
   - Verificar firma con `STRIPE_WEBHOOK_SECRET` ANTES de leer el evento.
   - Manejar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   - Idempotencia: guardar `event.id` procesados.
   - El estado del plan SIEMPRE se actualiza desde el webhook, nunca desde el redirect de éxito.
5. **Gating**: helper `getPlan(orgId)` en servidor; los límites se aplican en server actions, la UI solo los refleja.

## Colombia / LatAm
- Stripe cobra en USD/COP con tarjetas; si el cliente objetivo paga por PSE o Nequi, considerar Wompi o Mercado Pago para ese mercado y dejar Stripe para internacional. Decisión con Fernando antes de implementar doble pasarela.

## Checklist de salida
- [ ] Flujo completo probado en modo test (alta, upgrade, cancelación, pago fallido)
- [ ] Webhook con firma verificada e idempotente
- [ ] Límites de plan aplicados en servidor
- [ ] Sin claves de Stripe en el cliente (solo publishable key si aplica)
