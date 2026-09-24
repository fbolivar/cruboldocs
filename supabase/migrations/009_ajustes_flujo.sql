-- 009 · Ajustes detectados al conectar la UI:
-- 1. Quien registra el borrador (Líder SIG o de proceso) también adjunta archivos y lo envía,
--    aunque el cargo elaborador sea otro. La segregación de firmas no cambia (trigger).
-- 2. El bucket de documentos acepta PowerPoint como archivo fuente (la UI lo ofrece).
-- 3. Directorio de colegas: nombre y cargo (sin correo) de los miembros vigentes (la RLS de memberships
--    solo deja ver la propia a usuarios sin administración).

create or replace function public.can_edit_draft(v public.document_versions, d public.documents) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_position(d.organization_id) is not distinct from d.elaborador_position_id
    or v.elaborated_by = auth.uid()
$$;

revoke execute on function public.can_edit_draft from public, anon, authenticated;

create or replace function public.set_version_files(
  p_version uuid, p_pdf_path text, p_pdf_sha256 text, p_pdf_size bigint,
  p_source_path text, p_source_sha256 text, p_source_name text, p_source_size bigint
) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  if not public.can_edit_draft(v, d) then
    raise exception 'Solo el cargo elaborador puede adjuntar archivos' using errcode = '42501';
  end if;
  if v.status <> 'borrador' then
    raise exception 'Solo se reemplazan archivos de una versión en borrador' using errcode = '22023';
  end if;
  if split_part(p_pdf_path, '/', 1) <> d.organization_id::text or split_part(p_pdf_path, '/', 3) <> v.id::text
    or split_part(p_source_path, '/', 1) <> d.organization_id::text or split_part(p_source_path, '/', 3) <> v.id::text then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  update public.document_versions set
    pdf_path = p_pdf_path, pdf_sha256 = p_pdf_sha256, pdf_size = p_pdf_size,
    source_path = p_source_path, source_sha256 = p_source_sha256,
    source_file_name = p_source_name, source_size = p_source_size
  where id = p_version;
  perform public.log_event(d.organization_id, 'adjuntar_archivos', 'Documento', d.id,
    d.code || ' v' || v.version_no, jsonb_build_object('pdf_sha256', p_pdf_sha256));
end $$;

create or replace function public.submit_version(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  if not public.can_edit_draft(v, d) then
    raise exception 'Solo el cargo elaborador puede enviar a revisión' using errcode = '42501';
  end if;
  if v.status <> 'borrador' then
    raise exception 'La versión no está en borrador' using errcode = '22023';
  end if;
  if v.pdf_path is null or v.source_path is null then
    raise exception 'Adjunta el PDF y el archivo fuente antes de enviar' using errcode = '22023';
  end if;

  update public.document_versions set status = 'en_revision' where id = v.id;
  update public.documents set status = 'en_revision' where id = d.id;
  perform public.complete_tasks('corregir', v.id);
  perform public.create_task(d.organization_id, 'revisar', d.revisor_position_id, 'version', v.id,
    d.code, d.title, v.version_no, null, now() + interval '5 days');
  perform public.log_event(d.organization_id, 'enviar_revision', 'Documento', d.id, d.code || ' v' || v.version_no,
    jsonb_build_object('estado', jsonb_build_object('before', 'borrador', 'after', 'en_revision')));
end $$;

update storage.buckets set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
] where id = 'documentos';

/** Miembros vigentes de la organización con su cargo (solo para quien pertenece a ella). */
create or replace function public.org_directory(org uuid)
returns table (user_id uuid, full_name text, position_id uuid, position_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, m.position_id, pos.name
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  left join public.positions pos on pos.id = m.position_id
  where m.organization_id = org
    and m.status = 'activo'
    and current_date >= m.valid_from
    and (m.valid_until is null or current_date <= m.valid_until)
    and (public.is_active_member(org) or public.is_platform_admin())
$$;

revoke execute on function public.org_directory from public, anon;
grant execute on function public.org_directory to authenticated;
