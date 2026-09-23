---
name: arquitectura-saas
description: Metodología para definir la arquitectura de un SaaS antes de escribir código — entidades, alcance del MVP, rutas, integraciones y ADRs. Usar al iniciar todo proyecto nuevo o feature que cambie el modelo de datos.
---

# Arquitectura SaaS

## Cuándo usar
Al inicio de cada proyecto (/nueva-app) o cuando un feature altere el modelo de datos o agregue integraciones.

## Proceso

### 1. Entender el negocio (preguntar si falta)
- ¿Qué problema resuelve y para quién? (una frase)
- ¿Cuál es la acción de valor principal del usuario?
- ¿Modelo de cobro? (suscripción mensual, por uso, freemium)
- ¿Mercado? (afecta pagos: Colombia → considerar Wompi/Mercado Pago además de Stripe)

### 2. Modelo de dominio
- Lista de entidades con sus atributos clave y relaciones (texto o Mermaid).
- SIEMPRE incluir: `organizations`, `profiles` (usuarios), `memberships` (usuario↔org con rol). El multi-tenant no es opcional.
- Marcar qué entidades llevan datos sensibles (para RLS estricto y auditoría).

### 3. Alcance del MVP
- Tabla de features: feature | ¿va en v1? | justificación.
- Regla: si el producto funciona sin el feature, no va en v1. Cortar agresivo.
- Definir el "camino dorado": la secuencia mínima registro → configuración → valor.

### 4. Mapa de rutas
- Públicas: `/`, `/precios`, `/login`, `/registro`
- Privadas: `/app` (dashboard), y una ruta por módulo del MVP
- Cada ruta: qué muestra y qué rol la ve.

### 5. Integraciones y riesgos
- Servicios externos (email transaccional, pagos, storage) con su alternativa si falla.
- Top 3 riesgos técnicos y cómo se mitigan.

## Entregables
- `docs/ARQUITECTURA.md` con las 5 secciones anteriores.
- `docs/adr/NNN-titulo.md` por cada decisión con alternativas reales (formato: Contexto / Decisión / Consecuencias, máx. media página).

## Checklist de salida
- [ ] Multi-tenant definido (org + membership + rol)
- [ ] MVP cabe en 4-6 pantallas
- [ ] Camino dorado descrito de punta a punta
- [ ] Riesgos con mitigación
- [ ] Fernando aprobó el alcance antes de pasar a diseño
