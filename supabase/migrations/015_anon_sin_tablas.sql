-- 015 — Defensa en profundidad (pre-lanzamiento 2026-09-25): el rol anónimo no tiene
-- privilegios sobre las tablas de negocio. Hoy la RLS ya le niega todo (ninguna política
-- aplica a anon/public); con esto, si una política futura se escribe sin `to authenticated`,
-- tampoco quedaría expuesta. La app no consulta tablas sin sesión (getCurrentUser redirige
-- antes) y las páginas públicas usan el cliente de servidor con la clave secreta.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Tablas y secuencias que creen futuras migraciones (rol postgres) tampoco se otorgan a anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
