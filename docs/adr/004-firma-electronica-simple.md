# ADR-004 — Firma electrónica simple

**Contexto.** Aprobar y revisar requieren firma. La firma digital certificada está fuera de alcance.

**Decisión.** Firma = **reautenticación** (el usuario reingresa su contraseña en el servidor justo antes de firmar) + registro en `signatures` (firmante, acción, significado, fecha, IP, user agent) + `signature_hash` = SHA-256(version_id | file_sha256 | signer_id | acción | timestamp). Tabla de solo inserción.

**Consecuencias.** Es evidencia razonable de autoría e integridad para el SIG (firma electrónica, Ley 527 / Decreto 2364). No equivale a una firma digital certificada. Si se cambia el archivo, el hash deja de coincidir.
