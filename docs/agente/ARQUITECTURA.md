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

## 9. Decisiones abiertas (para Fernando)
- **Modelo:** ¿híbrido Sonnet/Opus (recomendado), solo Sonnet (más barato) o solo Opus (máxima calidad)?
- **Activación:** ¿opt-in por organización desde el panel de administración?
- **Límites de uso:** ¿cuántas acciones/tokens por organización al mes?
- **Alcance del MVP:** ¿confirmas que arranca solo con catálogo (sin redacción ni riesgos todavía)?

## 10. Riesgos
- **Privacidad/legal** si se activa sin cerrar §6 → bloqueante.
- **Acciones erróneas** del agente → mitigado por confirmación humana y por actuar con los permisos del usuario.
- **Costo** no acotado → mitigado por límites de uso y caching.
- **Inyección de prompts** desde contenido del cliente → mitigado por el diseño (contenido = dato).
