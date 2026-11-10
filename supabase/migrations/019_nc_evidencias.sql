-- 019 — Evidencias de No Conformidades en Storage. Mismo modelo endurecido que las evidencias de
-- control (AUD ALTA-01): bucket privado, lectura por RLS (URL firmada corta), escritura solo por
-- el servidor (service_role) que valida el archivo y promueve a la ruta final. La RPC recibe el
-- actor explícito y valida la ruta; la autorización (responsable/gestor) la hace la server action.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nc-evidencias', 'nc-evidencias', false, 26214400, null)
on conflict (id) do nothing;

-- nc-evidencias/<org>/<nc>/<uuid>/<archivo>: lo ve quien puede ver la NC (roles del SIG o quien la reportó).
create or replace function public.storage_can_read_nc_evidence(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(p_name, '/'); v_org uuid; v_nc uuid;
begin
  if array_length(parts, 1) <> 4 then return false; end if;
  begin
    v_org := parts[1]::uuid;
    v_nc := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.is_active_member(v_org) and (
    public.can_see_nonconformities(v_org)
    or exists (select 1 from public.nonconformities n
               where n.id = v_nc and n.organization_id = v_org and n.reported_by = (select auth.uid()))
  );
end $$;

revoke execute on function public.storage_can_read_nc_evidence from public, anon;
grant execute on function public.storage_can_read_nc_evidence to authenticated;

create policy nc_evidencias_read on storage.objects for select to authenticated
  using (bucket_id = 'nc-evidencias' and public.storage_can_read_nc_evidence(name));

-- Endurecer el registro de evidencia: la versión original de 017 (ejecutable por `authenticated`,
-- con el hash del cliente) se inhabilita; el registro pasa a `nc_add_evidence`, server-only con
-- actor explícito y validación estricta de ruta (patrón de `register_evidence`, AUD ALTA-01).
revoke execute on function public.add_nc_evidence(uuid, uuid, text, text, bigint, text, text) from public, anon, authenticated;

create or replace function public.nc_add_evidence(
  p_actor uuid, p_nc uuid, p_action uuid, p_path text, p_sha256 text, p_size bigint,
  p_name text, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities; v_id uuid;
begin
  select * into n from public.nonconformities where id = p_nc;
  if n.id is null then raise exception 'No conformidad no encontrada' using errcode = 'P0002'; end if;
  if p_actor is null or public.position_of(n.organization_id, p_actor) is null then
    raise exception 'Actor inválido' using errcode = '42501';
  end if;
  if p_action is not null and not exists (
    select 1 from public.nc_actions a where a.id = p_action and a.nonconformity_id = n.id
  ) then
    raise exception 'Acción no encontrada' using errcode = 'P0002';
  end if;
  -- Ruta: <org>/<nc>/<uuid>/<archivo> y hash de 64 hex (igual que la evidencia de control).
  if split_part(p_path, '/', 3) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or not public.is_safe_object_path(p_path, n.organization_id || '/' || n.id || '/' || split_part(p_path, '/', 3))
     or coalesce(p_sha256, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  insert into public.nc_evidences (organization_id, nonconformity_id, action_id, file_path, file_sha256, file_size, file_name, note, registered_by)
  values (n.organization_id, n.id, p_action, p_path, p_sha256, p_size, left(p_name, 255), trim(coalesce(p_note, '')), p_actor)
  returning id into v_id;
  perform public.log_event(n.organization_id, 'registrar_evidencia_nc', 'NoConformidad', n.id, n.code,
    jsonb_build_object('file_sha256', p_sha256), p_actor);
  return v_id;
end $$;

revoke execute on function public.nc_add_evidence from public, anon, authenticated;
grant execute on function public.nc_add_evidence to service_role;
