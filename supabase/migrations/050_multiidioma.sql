-- 050 — Multi-idioma (v1.4-4). Arquitectura: docs/multiidioma/ARQUITECTURA.md, ADR-091/092/093.
-- (a) Idioma por usuario en profiles.locale. (b) Traducción de contenido del cliente por tabla
-- genérica content_translations (sin duplicar tablas); v1 habilita la entidad 'documento'.

-- 050a · Idioma del usuario
alter table public.profiles add column if not exists locale text not null default 'es';
alter table public.profiles drop constraint if exists profiles_locale_chk;
alter table public.profiles add constraint profiles_locale_chk check (locale in ('es', 'en'));
-- IMPORTANTE: profiles usa permisos de lectura POR COLUMNA; una columna nueva NO hereda el SELECT.
-- Sin este grant, getCurrentUser (que lee `locale`) recibe 403 → profile nulo → /sin-acceso para todos.
grant select (locale) on public.profiles to authenticated;

create or replace function public.set_user_locale(p_locale text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_locale is null or p_locale <> all (array['es', 'en']) then
    raise exception 'Idioma no válido' using errcode = '22023';
  end if;
  update public.profiles set locale = p_locale where id = auth.uid();
end $$;

revoke execute on function public.set_user_locale(text) from public, anon;
grant execute on function public.set_user_locale(text) to authenticated;

-- 050b · Traducción de contenido del cliente (tabla genérica)
create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  locale text not null check (locale in ('es', 'en')),
  field text not null,
  value text not null check (length(value) <= 4000),
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_type, entity_id, locale, field)
);
create index on public.content_translations (organization_id, entity_type, entity_id, locale);

alter table public.content_translations enable row level security;
create policy content_translation_select on public.content_translations for select to authenticated using (public.is_active_member(organization_id));

-- Autorización de escritura por entidad (lista blanca de entity_type/field). v1: 'documento'.
create or replace function public.content_translation_authorize(p_entity_type text, p_entity_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if p_entity_type = 'documento' then
    select organization_id into v_org from public.documents where id = p_entity_id;
    if v_org is null or not public.is_active_member(v_org) then
      raise exception 'Documento no encontrado o sin acceso' using errcode = 'P0002';
    end if;
    if not (
      public.has_role(v_org, 'lider_sig')
      or public.has_role(v_org, 'lider_proceso', (select process_id from public.documents where id = p_entity_id))
      or public.has_role(v_org, 'elaborador', (select process_id from public.documents where id = p_entity_id))
    ) then
      raise exception 'No puedes traducir este contenido' using errcode = '42501';
    end if;
    return v_org;
  end if;
  raise exception 'Entidad no traducible' using errcode = '22023';
end $$;

-- "Sin traducción" se representa con valor vacío (baja lógica, sin hard delete): la capa de
-- datos trata value = '' como ausente y cae al original. La lista blanca de campos vive aquí.
create or replace function public.set_content_translation(p_entity_type text, p_entity_id uuid, p_locale text, p_field text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_val text;
begin
  if p_locale is null or p_locale <> all (array['es', 'en']) then
    raise exception 'Idioma no válido' using errcode = '22023';
  end if;
  if not (p_entity_type = 'documento' and p_field = any (array['title', 'description'])) then
    raise exception 'Campo no traducible' using errcode = '22023';
  end if;
  v_org := public.content_translation_authorize(p_entity_type, p_entity_id);
  v_val := left(trim(coalesce(p_value, '')), 4000);
  insert into public.content_translations (organization_id, entity_type, entity_id, locale, field, value)
  values (v_org, p_entity_type, p_entity_id, p_locale, p_field, v_val)
  on conflict (organization_id, entity_type, entity_id, locale, field)
    do update set value = excluded.value, updated_by = auth.uid(), updated_at = now();
end $$;

revoke execute on function public.content_translation_authorize(text, uuid), public.set_content_translation(text, uuid, text, text, text) from public, anon;
grant execute on function public.set_content_translation(text, uuid, text, text, text) to authenticated;
