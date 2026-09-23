---
name: deploy-vercel
description: Despliegue y operación del SaaS en Vercel con GitHub — entornos, variables, dominio, headers en producción, CI y rollback. Usar para publicar por primera vez, configurar entornos o resolver problemas de deploy.
---

# Deploy en Vercel

## Modelo de entornos
- GitHub como origen: `main` = producción; toda rama/PR genera Preview automático.
- Supabase: proyecto de desarrollo y proyecto de producción separados (o branches de Supabase). Las URLs/keys difieren por entorno.

## Primer deploy
1. Verificación local: `npm run lint && npm run build` en verde; auditoría del agente `seguridad` aprobada.
2. Importar el repo en Vercel (framework auto-detectado: Next.js).
3. Variables de entorno por entorno (Production / Preview / Development): las de `.env.example`, con valores de producción SOLO en Production.
4. Deploy y prueba del camino dorado completo en la URL de producción (registro → valor → pago en modo test).
5. Dominio: agregar en Vercel, configurar DNS (CNAME/A según registrador), esperar HTTPS automático.

## Post-deploy
- Verificar headers de seguridad en producción (curl -I o securityheaders.com).
- Configurar webhook de Stripe con la URL de producción y su `STRIPE_WEBHOOK_SECRET` propio.
- Activar Vercel Analytics (o al menos logs) para errores 500.
- Documentar en `docs/DEPLOY.md`: variables requeridas, pasos de rollback, contactos.

## Rollback
- Vercel → Deployments → deployment anterior estable → "Promote to Production" (instantáneo).
- Si el problema es de datos: nunca revertir migraciones a ciegas; escribir migración correctiva.

## Checklist de salida
- [ ] Producción y preview con variables correctas y separadas
- [ ] Dominio con HTTPS activo
- [ ] Webhooks apuntando a producción con secret propio
- [ ] Camino dorado probado en la URL real
- [ ] docs/DEPLOY.md con rollback documentado
