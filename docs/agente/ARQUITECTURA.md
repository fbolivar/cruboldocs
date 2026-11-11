# Crubol-Agent — Arquitectura (fase de diseño)

> Feature **v1.1** (post-lanzamiento). Este documento es el entregable de la fase de arquitectura:
> define alcance, diseño técnico, seguridad, privacidad y costo **antes** de escribir código.
> Fecha: 2026-11-09. Pendiente de aprobación de Fernando (parada obligatoria).

## 1. Objetivo
Un asistente de IA dentro de CrubolDocs, **Crubol-Agent**, que guía al usuario por la app y le
ayuda a **configurar y poblar su sistema de gestión** por conversación: crear procesos, tipos de
documento, cargos y roles; sugerir estructura según la actividad de la empresa; y, en fases
siguientes, apoyar la redacción de documentos y la medición de riesgos.

## 2. Alcance

### v1.1 (MVP del agente) — lo que SÍ entra
- Asistente conversacional (panel lateral) dentro de `/app`.
- **Acciones de catálogo** ejecutadas por el agente, siempre con **confirmación humana**:
  crear/editar procesos, tipos de documento, cargos y asignación de roles.
- **Onboarding guiado:** a partir de una breve descripción de la empresa, propone un mapa de
  procesos, cargos y tipos, y los crea tras aprobación.
- Respuestas de ayuda sobre cómo usar la app (navegación, significado de los campos).

### Fuera del MVP (fases siguientes)
- Redacción asistida de documentos (borradores de procedimientos, políticas).
- Apoyo a la identificación/valoración de riesgos y controles.
- Lectura masiva del contenido del cliente para sugerencias "a medida".
- Acciones que firmen, aprueben o cambien estados del flujo documental (**nunca** las hará el agente).

### Nunca (límites duros)
- El agente **no firma, no aprueba, no confirma lecturas** ni ejecuta pasos del flujo con valor
  probatorio. Esos actos son del usuario, con reautenticación (ADR-004).
- El agente **no usa la clave secreta (`service_role`)**. Actúa siempre con la sesión del usuario.

## 3. Modelo de interacción (UI)
- Panel lateral de chat en `/app` (abrible/colapsable), con streaming de la respuesta.
- Cuando el agente propone una **acción de escritura**, muestra una **tarjeta de confirmación**
  (qué va a crear/editar, con los datos exactos) y un botón **Confirmar** / **Cancelar**.
  Nada se escribe en la base sin ese "sí" explícito (human-in-the-loop).
- Historial de la conversación por sesión del navegador (no se persiste contenido sensible salvo
  lo que el usuario decida).

## 4. Arquitectura técnica

### 4.1 Dónde corre
- **Server-only** (route handler o server action en Next.js). La **API key de Anthropic** es un
  secreto de servidor (`ANTHROPIC_API_KEY` en Vercel), nunca llega al navegador.
- SDK oficial: `@anthropic-ai/sdk` (el proyecto es TypeScript). Nada de llamadas directas desde el cliente.

### 4.2 Modelo
- Default de calidad: **`claude-opus-5-5`** (Opus 5.5).
- Opción de costo para acciones rutinarias de catálogo: **`claude-sonnet-5-5`** (Sonnet 5.5,
  ~la mitad del costo). **Recomendación:** híbrido — Sonnet 5.5 para el flujo conversacional y las
  acciones de catálogo; Opus 5.5 reservado para tareas complejas (redacción de documentos) en fases
  siguientes. **Decisión de Fernando** (ver §9).
- Pensamiento adaptativo (`thinking: {type: "adaptive"}`) y streaming en la respuesta.

### 4.3 Cómo ejecuta acciones (tool use)
- Se definen **herramientas (tools) de usuario** que mapean 1:1 a acciones del dominio ya existentes:
  `crear_proceso`, `editar_proceso`, `crear_tipo_documento`, `crear_cargo`, `asignar_rol`, etc.
- Cada tool valida sus argumentos con esquema estricto (`strict: true`) y, al **confirmarse**, llama
  a la **misma lógica de servidor** que usa la UI de Administración — es decir, con la **sesión del
  usuario** y sujeta a **RLS** y a los chequeos de permiso existentes. El agente no obtiene ningún
  privilegio extra: si el usuario no puede crear un proceso, la acción falla igual.
- Bucle agéntico con el *tool runner* del SDK o un bucle manual; el agente propone → el usuario
  confirma → el servidor ejecuta → se devuelve el resultado al agente.

### 4.4 Contexto que ve el agente
- Solo metadatos de **su propia organización** necesarios para la tarea (lista de procesos/cargos/tipos
  existentes para no duplicar; la actividad que el usuario describa). **No** se le vuelca contenido de
  documentos ni datos personales en el MVP.

## 5. Seguridad
- **Actúa como el usuario:** sesión, organización y permisos del usuario autenticado. Jamás `service_role`.
  Toda escritura pasa por RLS y los guardas del dominio (igual que la UI).
- **Human-in-the-loop:** ninguna escritura sin confirmación explícita del usuario.
- **Inyección de prompts:** todo lo que venga del contenido del cliente (nombres, descripciones,
  futuros documentos) es **dato, no instrucción**. El prompt de sistema lo deja explícito y el agente
  nunca ejecuta instrucciones embebidas en el contenido.
- **Alcance de tools:** el agente solo tiene las herramientas de catálogo. No existen tools que firmen,
  aprueben, cambien estados, ni que lean correos o datos personales.
- **CSP:** agregar el origen de la API solo donde haga falta (las llamadas son server-side, así que el
  navegador no habla con Anthropic directamente → no requiere cambios de CSP del cliente).
- **Límites de uso:** rate limiting por organización/usuario (reusar Upstash) para acotar costo y abuso.

## 6. Privacidad y cumplimiento (Ley 1581)
- Usar la API de Claude implica un **nuevo sub-encargado (Anthropic)** y una **transferencia
  internacional** de los datos que se le envíen. Prerrequisitos **bloqueantes** antes de activar:
  1. Actualizar `/tratamiento-de-datos`: declarar a Anthropic como encargado y la transferencia (como
     ya se hace con Supabase/Vercel/Upstash/Cloudflare).
  2. Actualizar `/terminos`: uso de IA, alcance y responsabilidad.
  3. **Consentimiento** del cliente para habilitar el agente (opt-in por organización).
- **No-entrenamiento:** usar la API comercial de Anthropic (los datos de la API no se usan para
  entrenar). Documentar la retención.
- **Minimización:** en el MVP el agente no recibe contenido de documentos ni PII; solo metadatos del
  catálogo. Cuando una fase futura envíe contenido, revalidar privacidad.

## 7. Costo
- Precios de referencia (API Anthropic, por 1M tokens): Sonnet 5.5 $2 entrada / $10 salida;
  Opus 5.5 $4 / $20.
- Una sesión de onboarding típica (describir empresa → proponer y crear catálogo) ronda unos pocos
  miles de tokens → **centavos** con Sonnet. El costo lo asume Crubol en v1.1; definir **límites de uso**
  por organización.
- Reducir costo con *prompt caching* del prompt de sistema y del catálogo estable.

## 8. Fases de implementación
1. **Fase A (MVP):** panel de chat + tools de catálogo (procesos/tipos/cargos/roles) con confirmación
   humana + onboarding guiado. Prerrequisitos de privacidad (§6) cerrados.
2. **Fase B:** redacción asistida de documentos (borradores), con el usuario como autor/firmante.
3. **Fase C:** apoyo a riesgos (identificación, valoración sugerida, controles).

## 9. Decisiones confirmadas (Fernando, 2026-11-09)
- **Modelo:** **híbrido** — `claude-sonnet-5-5` para conversación y acciones de catálogo; `claude-opus-5-5`
  reservado para tareas complejas (redacción) en fases siguientes.
- **Alcance MVP:** **solo catálogo** (procesos/tipos/cargos/roles) con confirmación humana + onboarding
  guiado. Sin redacción de documentos ni riesgos en el MVP.
- **Activación:** **opt-in por organización** (bandera que enciende el agente para esa org).
- **Límites de uso:** **por organización**. Default propuesto (configurable): ~200 acciones del agente/mes
  por org; ajustable por Fernando.

## 10bis. Plan de implementación del MVP (orden)
1. **Prerrequisitos de privacidad (bloqueante):** declarar a Anthropic como encargado + transferencia
   internacional en `/tratamiento-de-datos`; nota de uso de IA en `/terminos`; flujo de consentimiento
   (opt-in) por organización. *Hacer cuando se vaya a activar, no antes.*
2. **Esquema:** bandera `ai_agent_enabled` (u opt-in) en `organizations`; tabla/contador de uso del agente
   por organización (para los límites). Migración versionada + pruebas RLS.
3. **Backend del agente:** route handler server-only con `@anthropic-ai/sdk`; `ANTHROPIC_API_KEY` como
   secreto en Vercel; definición de **tools** (`crear_proceso`, `crear_tipo_documento`, `crear_cargo`,
   `asignar_rol`, …) que invocan la lógica de dominio existente **con la sesión del usuario** (RLS);
   streaming; rate limiting por organización (Upstash).
4. **UI:** panel de chat lateral en `/app` con streaming y **tarjetas de confirmación** para cada acción
   de escritura; historial por sesión.
5. **Seguridad/QA:** pruebas de que el agente no obtiene privilegios extra (RLS), blindaje anti-inyección,
   y revisión de seguridad del diff antes de activar.
6. **Activación gradual:** encender primero para la organización de Crubol; luego a clientes con consentimiento.

> Recomendación de proceso: construir esto en una **sesión/fase dedicada** (contexto limpio), siguiendo
> el método del proyecto (`/fase` o `/feature`). Es un feature grande; no conviene improvisarlo.

## 10. Riesgos
- **Privacidad/legal** si se activa sin cerrar §6 → bloqueante.
- **Acciones erróneas** del agente → mitigado por confirmación humana y por actuar con los permisos del usuario.
- **Costo** no acotado → mitigado por límites de uso y caching.
- **Inyección de prompts** desde contenido del cliente → mitigado por el diseño (contenido = dato).

---

# Crubol-Agent — Fase C: Copiloto de causa raíz / CAPA / riesgos (arquitectura)

> Entregable de la **fase de arquitectura** de la evolución del agente más allá del catálogo.
> Fecha: 2026-11-11. **Pendiente de aprobación de Fernando (parada obligatoria).** No se escribe
> código ni migraciones en esta fase. El MVP de catálogo (Fase A) ya está desplegado; esta fase es
> la primera que lee **contenido** del SGC (decisión de Fernando, 2026-11-11).

## C.1. Objetivo
En la **ficha de una No Conformidad** o de un **Riesgo**, un copiloto que —bajo demanda y solo con
ese registro— ayuda al responsable a:
- **NC:** redactar el **análisis de causa** (p. ej. 5 porqués en texto) y proponer el **plan de
  acciones CAPA** (corrección y acción correctiva, con responsable y plazo sugeridos).
- **Riesgo:** proponer **controles** y una **valoración** (probabilidad/impacto) sugerida.

Es donde el mercado está invirtiendo (Veeva "Quality Event Agents", Qualityze, SoftExpert Copilot):
IA **dentro** del flujo de CAPA/causa raíz, con el humano aprobando. Mantiene intactos los límites
duros del agente.

## C.2. Alcance

### Entra (MVP de Fase C)
- Botón **"Sugerir con Crubol-Agent"** en las secciones **Análisis de causa** y **Plan de acción**
  de la ficha de NC, y en **Controles** y **Valoración** de la ficha de Riesgo.
- El agente **lee solo el registro abierto** (minimización, decisión de Fernando) y genera la
  sugerencia; el usuario la revisa.
- **Ejecuta con confirmación** (decisión de Fernando): cada acción de escritura se materializa con una
  **tarjeta de confirmación** que invoca la **misma acción de dominio** que la UI (sesión del usuario → RLS).

### Fuera del MVP de Fase C
- Redacción de documentos (es la Fase B, se hará aparte).
- Lectura de **varios** registros / recuperación amplia (se descartó por privacidad/costo).
- Cualquier acción con valor probatorio (ver límites duros).

### Nunca (límites duros, sin cambios — ADR-004)
- El agente **no verifica eficacia, no cierra, no aprueba, no cambia estados** del flujo. En NC solo
  puede **proponer** causa y acciones; la verificación de eficacia y el cierre siguen siendo actos del
  usuario. No usa `service_role`.

## C.3. Modelo de dominio (sin cambios de esquema)
Reusa lo existente; **no crea tablas nuevas**:
- NC: `nonconformities`, `nc_actions` → tools que mapean a `setNcCause(ncId, cause, ownerPositionId?)`
  y `addNcAction(input)`.
- Riesgo: `risks`, `controls`, `risk_assessments` → tools que mapean a `addControl(...)` y
  `addAssessment(riskId, kind, p, i)`.
- Uso/límites: reusa `ai_agent_usage` + `ai_agent_consume` (ya existen); se amplían las acciones
  contadas. Opcional (ADR-052): marcar en `audit_log` que una acción fue **"asistida por IA"** (campo
  en el `meta` del evento) para trazabilidad, sin tabla nueva.

## C.4. Contexto que ve el agente (minimización)
Solo el **registro abierto**, y acotado:
- **NC:** código, origen, proceso, descripción, severidad y las **acciones ya registradas** (para no
  duplicar). **Se excluye el dato personal del cliente** (p. ej. `customer_name`/`customer_contact`
  cuando la NC viene de `queja_pqrs`): no se envía a Anthropic.
- **Riesgo:** descripción, proceso, valoración actual y controles existentes.
No se envían otros registros, ni correos, ni PII. El contexto se arma **en el servidor** a partir de
lo que el usuario ya puede ver (RLS), nunca más.

## C.5. Interacción (UI)
- Botón contextual en la ficha → abre el **panel del agente** (ya existe) con la sugerencia en
  streaming.
- Cada acción de escritura propuesta se muestra como **tarjeta de confirmación** (qué va a escribir,
  con los datos exactos) + **Confirmar/Cancelar**. Nada se escribe sin ese "sí" (human-in-the-loop).
- La sugerencia de texto (causa) también puede **copiarse** al campo sin ejecutar, por si el usuario
  prefiere editarla antes de guardar.

## C.6. Seguridad
- **Actúa como el usuario:** las tools llaman a las acciones de dominio existentes con la **sesión del
  usuario** → RLS y guardas de rol. Si el usuario no puede gestionar esa NC/riesgo, la acción falla igual.
- **Anti-inyección (crítico):** la **descripción** de una NC o un riesgo es **contenido del cliente** y
  puede traer texto malicioso ("ignora tus instrucciones…"). El prompt de sistema lo declara **dato, no
  instrucción**; el agente solo dispone de las tools de causa/acción/control/valoración y ninguna de
  firmar/cerrar/aprobar, así que una inyección no puede escalar privilegios.
- **Human-in-the-loop** en toda escritura. **No `service_role`.**
- **Límites de uso** por organización (reusa `ai_agent_consume`) para acotar costo/abuso.

## C.7. Privacidad y cumplimiento (Ley 1581) — **gate legal (bloqueante)**
Esta fase **amplía** lo que se envía a Anthropic: ya no solo el catálogo, sino el **contenido del
registro (NC/riesgo) que el usuario abra y para el que pida ayuda, bajo demanda**. Por eso:
1. **Ampliar `/tratamiento-de-datos` §6** y **`/terminos` §9** para declarar este nuevo alcance de
   datos (contenido de NC/riesgos, bajo demanda, minimizado y sin PII del cliente). **Requiere revisión
   legal del abogado de Fernando** (igual que la versión de catálogo de 2026-11-10).
2. **Minimización verificada:** excluir `customer_name`/`customer_contact` y cualquier PII del payload.
3. **Opt-in por organización** (ya existe) y **desactivado por defecto**.
4. **No-entrenamiento:** API comercial de Anthropic.
Decisión de Fernando (2026-11-11): **se avanza arquitectura → diseño → backend/UI detrás de la bandera
opt-in, desactivado; la activación para clientes espera el OK legal del alcance ampliado.**

## C.8. Costo
- Causa raíz/CAPA se benefician de razonamiento → **Opus 5.5** para el análisis; **Sonnet 5.5** para la
  interacción simple (híbrido, coherente con §9). Una sugerencia típica envía un registro + system
  prompt → pocos miles de tokens → centavos. Reusar **prompt caching** del system prompt y **límites por
  organización**. Costo asumido por Crubol en v1.x.

## C.9. Plan de implementación (de la Fase C)
1. **Prerrequisito de privacidad ampliado (bloqueante, legal, en paralelo).**
2. **Backend:** nuevas tools (`sugerir_causa_nc`, `proponer_accion_capa`, `sugerir_control`,
   `sugerir_valoracion`) que invocan `setNcCause`/`addNcAction`/`addControl`/`addAssessment` con la
   sesión del usuario; armado del **contexto mínimo** del registro (sin PII); streaming; límites.
3. **UI:** botones "Sugerir" en las fichas de NC y Riesgo + tarjetas de confirmación (reusa el panel).
4. **Seguridad/QA:** pruebas de que el agente no obtiene privilegios extra (RLS), blindaje
   anti-inyección, **minimización verificada** (el payload no lleva PII), y auditoría del diff **antes de
   activar**.
5. **Activación:** tras el OK legal, opt-in por organización.

## C.10. ADRs de esta fase
- **ADR-051** — Fase C: copiloto de causa/CAPA/riesgos; minimización "solo el registro abierto, bajo
  demanda"; exclusión de PII del cliente.
- **ADR-052** — Ejecución por **tools con confirmación** que reusan las acciones de dominio (RLS);
  límites duros (no verifica/cierra/aprueba); trazabilidad "asistido por IA" en `audit_log`.
- **ADR-053** — Ampliación de la **declaración de privacidad** y **gate legal**; feature tras opt-in
  **desactivado** hasta el OK.
