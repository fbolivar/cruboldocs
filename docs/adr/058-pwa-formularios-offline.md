# ADR-058 — PWA offline de formularios: service worker propio + cola en IndexedDB

## Contexto
Las inspecciones y listas de verificación en campo ocurren sin señal. El Constructor de formularios
(#5) solo funciona en línea. Se necesita **instalar la app** y **diligenciar offline**, sincronizando al
reconectar, sin introducir dependencias de terceros (CLAUDE.md: sin dependencias nuevas sin justificación).

## Decisión
Se agrega un **`manifest.webmanifest`** (app instalable) y un **service worker propio** (`public/sw.js`,
sin librería) que precachea el shell de la vista de diligenciar y hace *runtime cache* del formulario
publicado que el usuario abre. Las respuestas diligenciadas sin red se guardan en una **cola en
IndexedDB** (por usuario) y se **envían al reconectar** vía `submit_new_submission`; la **validación
server-side** se aplica al sincronizar (un fallo marca el ítem para corregir). Las **cachés e IndexedDB
se limpian al cerrar sesión** (privacidad en dispositivos compartidos). Alcance acotado a formularios (el
offline del resto de la app y los adjuntos se difieren).

## Consecuencias
- Cubre el caso real (campo sin señal) reusando el motor de formularios y su validación server-side.
- Sin dependencias nuevas; el SW se versiona para evitar cachés obsoletos.
- Una respuesta offline contra una versión que luego se re-publica se valida contra la vigente al
  sincronizar; se avisa y se corrige (refinamiento futuro: enviar con la versión capturada). Ver [ADR-059].
