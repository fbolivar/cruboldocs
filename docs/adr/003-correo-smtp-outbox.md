# ADR-003 — Correo transaccional por SMTP propio con outbox

**Contexto.** La v1 incluye notificaciones por correo. Alternativas: Resend (SaaS externo), SMTP de Supabase (solo apto para auth) o SMTP propio de Crubol/cliente.

**Decisión.** SMTP propio vía `nodemailer` (credenciales en variables de Vercel). Cada notificación se escribe en `email_outbox`; se intenta el envío inmediato y un cron diario reintenta los pendientes.

**Consecuencias.** Sin costo adicional y con el dominio del cliente. Dependemos de los límites del SMTP (Microsoft 365/Google). La bandeja in-app es la fuente de verdad; el correo es un aviso. Cuenta: SMTP propio en Hostinger (smtp.hostinger.com:465, SSL). Revisar su límite de envíos diarios en la fase backend.
