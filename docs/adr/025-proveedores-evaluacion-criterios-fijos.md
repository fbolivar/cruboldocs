# ADR-025 — Evaluación de proveedores: criterios ponderados fijos y resultado en el servidor

## Contexto
8.4.1/8.4.2 exigen evaluar al proveedor por criterios y clasificar su desempeño. Opciones: criterios/pesos
**configurables** por organización (flexible pero más superficie: UI de configuración, validación, versiones)
o **criterios fijos** con pesos y umbrales por defecto (simple, suficiente para el MVP).

## Decisión
Tres criterios fijos 0–100 — **Calidad** (peso 50), **Cumplimiento/entrega** (30), **Servicio/precio** (20) —
con `total = round(Σ score·peso / Σ peso, 2)` y umbrales **≥80 aprobado / 60–79 condicionado / <60 rechazado**.
El `total_score` y el `result` se **calculan y persisten solo en el RPC** (constantes del servidor), nunca se
aceptan del cliente (el cálculo en el navegador es solo vista previa). Cada evaluación guarda una **foto de
los pesos** usados; la **última evaluación por fecha** define el `status` y `next_eval_date` del proveedor.

## Consecuencias
- Acota la superficie (sin UI ni almacenamiento de configuración) y hace la evaluación auditable y reproducible.
- Guardar los pesos por evaluación permite cambiar los defaults a futuro sin reescribir el histórico.
- Si una organización necesita otros criterios/pesos, es una ampliación (criterios configurables) que deberá
  auditarse; el `result` seguiría calculándose en el servidor.
