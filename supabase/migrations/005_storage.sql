-- 005 · Storage privado. Lectura con RLS (el cliente pide URLs firmadas cortas).
-- Escritura: solo el servidor, que emite URLs de subida firmadas tras autorizar
-- con las funciones del flujo (los clientes no tienen políticas de insert/update/delete).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documentos', 'documentos', false, 26214400, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('evidencias', 'evidencias', false, 26214400, null)
on conflict (id) do nothing;

/** documentos/<org>/<doc>/<version>/<archivo>: ve contenido y ve la versión. */
create or replace function public.storage_can_read_document(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(p_name, '/'); v_org uuid; v_version uuid;
begin
  if array_length(parts, 1) <> 4 then return false; end if;
  begin
    v_org := parts[1]::uuid;
    v_version := parts[3]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.can_view_content(v_org) and public.can_see_version(v_version)
    and exists (select 1 from public.document_versions where id = v_version and organization_id = v_org);
end $$;

/** evidencias/<org>/<control>/<evidencia>/<archivo>: quien ve riesgos de la organización. */
create or replace function public.storage_can_read_evidence(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(p_name, '/'); v_org uuid;
begin
  if array_length(parts, 1) <> 4 then return false; end if;
  begin
    v_org := parts[1]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.is_active_member(v_org) and public.can_see_risks(v_org);
end $$;

revoke execute on function public.storage_can_read_document, public.storage_can_read_evidence from public, anon;
grant execute on function public.storage_can_read_document, public.storage_can_read_evidence to authenticated;

create policy documentos_read on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.storage_can_read_document(name));

create policy evidencias_read on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and public.storage_can_read_evidence(name));
