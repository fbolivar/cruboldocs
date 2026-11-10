# ADR-020 — Modelo de competencias: catálogo + perfil por cargo + evaluación con brecha

## Contexto
7.2 basa la competencia en educación, formación, habilidades y experiencia, y exige determinar lo
**requerido** por el puesto, asegurarlo y conservar evidencia. Dos extremos: (a) texto libre de
"requisitos del cargo" (rápido, pero no mide brechas ni se audita); (b) un LMS completo (cursos,
contenidos, quizzes, rutas) — otro producto, caro y fuera de 7.2.

## Decisión
Modelo intermedio y estructurado, mínimo viable:
1. **`competencies`** — catálogo por organización con `kind` (educacion/formacion/habilidad/experiencia).
2. **`position_competencies`** — perfil del **cargo**: competencia + `required_level` (1..3) + obligatoria.
3. **`trainings` + `training_attendees`** — formación tomada por persona, con certificado y vencimiento.
4. **`competency_assessments`** — evaluación de la persona por competencia (`assessed_level`), `meets`
   derivado (evaluado ≥ requerido) y `status` cumple/brecha/brecha_en_plan.
La **matriz** (persona × competencia) y la cobertura (%) son **vistas derivadas**, no se persisten.
Fuera de v1: LMS, contenidos de curso, versionado del perfil del cargo, importación masiva.

## Consecuencias
- Se puede medir y auditar la **brecha** (el entregable de valor) sin construir un LMS.
- Los niveles 1..3 (básico/intermedio/avanzado) son suficientes y simples; si luego se requiere una escala
  distinta, se migra el `smallint` sin romper el modelo.
- La matriz derivada evita duplicar estado, pero obliga a calcularla en servidor al leer (aceptable por el
  volumen: cargos × competencias por organización es pequeño).
