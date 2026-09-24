// Arnés local: aplica las migraciones sobre PGlite con un Supabase mínimo simulado.
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("../..", import.meta.url))

export const SUPABASE_SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create schema storage;
grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant execute on function auth.jwt() to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`

export async function freshDb() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(SUPABASE_SHIM)
  const dir = join(ROOT, "supabase/migrations")
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, f), "utf8"))
    } catch (e) {
      throw new Error(`${f}: ${e.message}`)
    }
  }
  return db
}

/** Ejecuta `fn` como usuario autenticado (RLS activo). */
export async function as(db, userId, sql, params = [], aal = "aal1") {
  const claims = JSON.stringify({ sub: userId ?? "", aal })
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);
    select set_config('request.jwt.claims', '${claims}', false);`)
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`)
  }
}

/** Como `as`, con sesión de segundo factor (aal2). */
export const asMfa = (db, userId, sql, params = []) => as(db, userId, sql, params, "aal2")

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const db = await freshDb()
  const t = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
  console.log("Migraciones aplicadas. Tablas sin RLS:", t.rows.length ? t.rows : "ninguna")
}
