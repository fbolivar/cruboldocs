# Borrador para revisión legal — Ampliación de privacidad de Crubol-Agent (Fase C)

> **Para:** abogado de Crubol / Fernando Bolívar · **De:** equipo de producto CrubolDocs · **Fecha:** 2026-11-11
> **Asunto:** ampliar las cláusulas de IA (§6 de la Política de Tratamiento de Datos y §9 de los Términos) para una nueva versión del asistente **Crubol-Agent** que, bajo demanda, procesa el **contenido del registro** que el usuario abre.
>
> Este documento es un **borrador de producto, no asesoría legal**. Requiere tu revisión y ajuste antes de publicarse. La función **no se activará para ningún cliente** hasta tu visto bueno.

## 1. Qué cambia respecto de lo aprobado el 2026-11-10
La versión vigente del asistente (aprobada por ti) solo envía a Anthropic **datos del catálogo** (nombres de procesos, tipos de documento y cargos) y el texto de la conversación. **Explícitamente dice que no accede al contenido de los documentos.**

La nueva versión (Fase C) añade un **copiloto** dentro de las fichas de **No Conformidades** y **Riesgos**. Cuando el usuario lo pide expresamente (botón "Sugerir"), el servidor envía a Anthropic **únicamente ese registro abierto** para proponer: análisis de causa y plan de acciones (NC); controles y valoración (riesgo). Características de diseño relevantes para lo legal:

- **Bajo demanda y por registro:** solo se envía el registro para el que el usuario pide ayuda en ese momento. No hay lectura masiva ni en segundo plano.
- **Minimización:** se excluye el **dato personal del cliente** del envío (p. ej., nombre y contacto del peticionario cuando la NC proviene de una PQRS). Se envían la descripción técnica, el proceso, la severidad/valoración y las acciones ya registradas.
- **Riesgo residual a declarar:** las **descripciones** de NC/riesgos son texto libre y **podrían contener datos personales** incidentales escritos por el usuario (p. ej., el nombre de un responsable). Por eso la cláusula debe cubrir "el contenido del registro", no solo "metadatos".
- Se mantiene: **opt-in por organización, desactivado por defecto**; el usuario **confirma** toda escritura; el modelo **no entrena** con estos datos; transferencia internacional a EE. UU. (ya autorizada).

## 2. Texto propuesto — §6 Política de Tratamiento de Datos (viñeta de Anthropic)

**Texto actual:**
> Anthropic (API de Claude): solo si tu organización activa el asistente de IA Crubol-Agent, que está desactivado por defecto. Procesa en Estados Unidos el texto de tu conversación con el asistente y el catálogo de tu organización (nombres de procesos, tipos de documento y cargos) para generar las sugerencias que tú confirmas. Anthropic no usa estos datos para entrenar sus modelos. En esta versión el asistente no accede al contenido de tus documentos ni a los datos de otras organizaciones.

**Texto propuesto (redline):**
> Anthropic (API de Claude): solo si tu organización activa el asistente de IA Crubol-Agent, que está desactivado por defecto. Procesa en Estados Unidos el texto de tu conversación con el asistente, el catálogo de tu organización (nombres de procesos, tipos de documento y cargos) y, **cuando lo solicitas expresamente dentro de una ficha, el contenido del registro que abres** —una no conformidad o un riesgo— **para sugerir su análisis de causa, acciones, controles o valoración, que tú confirmas**. **El asistente procesa únicamente el registro para el que pides ayuda en ese momento; no realiza lecturas masivas ni en segundo plano, y se omiten los datos de contacto del peticionario cuando la no conformidad proviene de una PQRS.** Anthropic no usa estos datos para entrenar sus modelos. El asistente no accede a los datos de otras organizaciones **ni ejecuta por sí mismo ninguna acción sin tu confirmación**.

## 3. Texto propuesto — §9 Términos (Asistente de IA)

**Ajustes propuestos (sobre el texto vigente):**
- Primer párrafo — ampliar la descripción del alcance:
  > Crubol-Agent es una función opcional de inteligencia artificial que ayuda a configurar el catálogo de la organización (procesos, tipos de documento y cargos) **y, dentro de las fichas de no conformidades y riesgos, a redactar el análisis de causa, el plan de acciones, los controles o la valoración**, conversando con el Usuario. Está desactivada por defecto y solo se habilita por organización, a solicitud o con el consentimiento del Cliente.
- Segundo párrafo — mantener los límites, precisando el alcance de lectura:
  > El asistente únicamente **propone** acciones: no se crea, modifica ni elimina nada sin que un Usuario con permiso lo **confirme**. No firma, no aprueba, no cierra ni verifica la eficacia, y **solo accede al registro que el Usuario abre y para el que pide ayuda**; no accede al contenido de otros registros ni a los datos de otras organizaciones.
- Cuarto párrafo — ampliar la categoría de datos enviada:
  > Para prestar esta función, Crubol utiliza la API de Claude de Anthropic como encargado, que procesa en Estados Unidos el texto de la conversación, el catálogo **y el contenido del registro para el que el Usuario solicita ayuda**, no usa esos datos para entrenar sus modelos y los trata solo para generar las sugerencias. (…sigue igual, con el enlace a la Política.)

## 4. Puntos que te pido validar
1. **Suficiencia del consentimiento:** ¿basta el **opt-in por organización** (el Cliente habilita la función para toda la organización) o exiges un aviso/consentimiento **adicional por registro** o una advertencia en el propio botón "Sugerir"?
2. **Dato personal incidental:** ¿es suficiente la minimización descrita (omitir contacto del peticionario; enviar solo el registro abierto) o exiges una **advertencia al usuario** de no escribir datos personales innecesarios en las descripciones?
3. **Retención en Anthropic:** ¿quieres que declaremos el plazo de retención de la API (según el acuerdo comercial con Anthropic) de forma explícita en §6?
4. **Vigencia:** al publicar, fijamos la nueva fecha de vigencia de ambas páginas (como se hizo el 10 de noviembre de 2026).
5. **Alcance futuro:** la próxima fase (redacción asistida de documentos) enviará **contenido de documentos**; ¿prefieres una cláusula que ya lo contemple o lo tratamos como una ampliación posterior?

## 5. Garantías técnicas que respaldan el texto
- La función vive **detrás de la bandera opt-in, desactivada**, hasta tu visto bueno (ADR-053).
- El asistente actúa con la **sesión y permisos del usuario** (RLS): no accede a nada que el usuario no pueda ver.
- **Human-in-the-loop:** ninguna escritura sin confirmación explícita (ADR-052).
- **Minimización verificada en pruebas:** el envío no incluye datos de contacto del cliente (se auditará antes de activar).
