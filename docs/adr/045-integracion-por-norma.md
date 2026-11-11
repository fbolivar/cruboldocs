# ADR-045 — Integración por norma aditiva (chips, filtros y segmento del Tablero)

## Contexto
Etiquetar por norma solo aporta valor si se **ve** y se **filtra** en los módulos y el Tablero, sin desestabilizar lo ya desplegado.

## Decisión
La integración es **aditiva y módulo a módulo**: un **chip de norma** en las listas/fichas de procesos, documentos, riesgos, NC, objetivos y requisitos; un **filtro "Norma"** en esos tableros; y un **segmento "Norma"** en el Tablero gerencial para ver, p. ej., "el SG-SST". Nada de esto cambia los esquemas existentes (lee `entity_norms`); se despliega por partes para no arriesgar los módulos en producción.

## Consecuencias
- Riesgo de regresión bajo: cada módulo se toca de forma independiente y pequeña.
- El Tablero gana una dimensión (norma) reutilizando su arquitectura de lectura.
- Si una org no activa 14001/45001, los filtros simplemente no muestran esas normas.
