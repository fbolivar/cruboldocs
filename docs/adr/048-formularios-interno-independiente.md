# ADR-048 — MVP interno e independiente; público/adjuntos/firma diferidos

## Contexto
El constructor podría integrarse con auditorías/actas/PQRS y ofrecer diligenciamiento público, adjuntos y firma. Todo junto es inabarcable y arriesga los módulos en producción.

## Decisión
El MVP es un **módulo independiente** `/app/formularios`, **interno** (usuarios con sesión; RLS por organización y rol). Se **difieren**: diligenciamiento **público por link** (reusaría el patrón de token/anti-abuso de la Encuesta, v1.1-5b), **adjuntos** (Storage), **firma** (ADR-004), **lógica condicional/fórmulas**, **tabla/grilla** y **analítica**. Se mantiene **separado de la Encuesta** (v1.1-2), que es pública/anónima y específica de 9.1.2.

## Consecuencias
- Entrega el valor "diseña tus formatos" sin tocar los módulos existentes ni abrir superficie pública nueva.
- Cada diferido entra con su propia auditoría (Storage, firma, público).
- Si se requiere lista de verificación dentro de Auditorías, se integra reutilizando el motor.
