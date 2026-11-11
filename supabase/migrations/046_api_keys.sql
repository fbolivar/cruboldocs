-- 046 — API pública de solo lectura (v1.3). Arquitectura: docs/api/ARQUITECTURA.md, ADR-078/079/080.
-- Claves de API por organización: se guarda solo el SHA-256 del token (nunca el token en claro).
-- Verificación servidor-a-servidor (cliente de servicio); el filtrado por organización lo hace cada
-- endpoint (no hay RLS en el acceso por key). Aquí: tabla + RLS de lectura para administración + RPCs.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  key_prefix text not null,
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  unique (id, organization_id)
);
create index on public.api_keys (organization_id);

alter table public.api_keys enable row level security;
-- Solo quien administra la organización ve sus claves (y nunca el hash sirve para reconstruir el token).
create policy api_key_select on public.api_keys for select to authenticated using (public.can_manage_org(organization_id));

create or replace function public.create_api_key(p_org uuid, p_name text, p_scopes text[], p_prefix text, p_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; s text;
begin
  if not public.can_manage_org(p_org) then
    raise exception 'No puedes administrar las claves de API' using errcode = '42501';
  end if;
  if p_scopes is null or array_length(p_scopes, 1) is null then
    raise exception 'Elige al menos un permiso de lectura' using errcode = '22023';
  end if;
  foreach s in array p_scopes loop
    if s <> all (array['read:nonconformities','read:indicators','read:risks','read:audits','read:pqrs']) then
      raise exception 'Permiso no válido: %', s using errcode = '22023';
    end if;
  end loop;
  if p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Clave no válida' using errcode = '22023';
  end if;
  insert into public.api_keys (organization_id, name, key_prefix, key_hash, scopes)
  values (p_org, trim(p_name), p_prefix, p_hash, p_scopes)
  returning api_keys.id into v_id;
  perform public.log_event(p_org, 'crear_api_key', 'ApiKey', v_id, trim(p_name), jsonb_build_object('scopes', to_jsonb(p_scopes)));
  return v_id;
end $$;

create or replace function public.revoke_api_key(p_key uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare k public.api_keys;
begin
  select * into k from public.api_keys where id = p_key;
  if k.id is null or not public.is_active_member(k.organization_id) then
    raise exception 'Clave no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_org(k.organization_id) then
    raise exception 'No puedes revocar esta clave' using errcode = '42501';
  end if;
  if k.revoked_at is not null then
    raise exception 'La clave ya está revocada' using errcode = '22023';
  end if;
  update public.api_keys set revoked_at = now() where id = k.id;
  perform public.log_event(k.organization_id, 'revocar_api_key', 'ApiKey', k.id, k.name, '{}');
end $$;

revoke execute on function public.create_api_key, public.revoke_api_key from public, anon;
grant execute on function public.create_api_key, public.revoke_api_key to authenticated;
