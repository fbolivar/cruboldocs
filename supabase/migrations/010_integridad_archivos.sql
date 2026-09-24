-- 010 · Integridad de archivos (AUD-20260924: ALTA-01, MED-02, MED-05).
-- 1. set_version_files y register_evidence dejan de ser ejecutables por `authenticated`:
--    reciben hash, tamaño y ruta, y esos valores solo los calcula el servidor tras descargar
--    y validar el archivo. Se invocan con service_role pasando el actor explícito (como sign_version).
-- 2. Las rutas se validan con una expresión estricta (sin `..`, `%`, `\` ni `//`) y los hashes
--    con formato SHA-256; ya no basta con comparar segmentos.
-- 3. El bucket `evidencias` acepta solo PDF, imágenes raster, CSV y Office.

/** Cargo del usuario en la organización si su membresía está vigente (organización activa). */
create or replace function public.position_of(org uuid, p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.position_id from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.organization_id = org and m.user_id = p_user
    and m.status = 'activo' and o.status = 'activa'
    and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until)
$$;

/** ¿El usuario tiene membresía vigente en la organización? */
create or replace function public.is_member_of(org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org and m.user_id = p_user
      and m.status = 'activo' and o.status = 'activa'
      and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until)
  )
$$;

revoke execute on function public.position_of, public.is_member_of from public, anon, authenticated;

/** `<prefijo>/<nombre seguro>`: el nombre no tiene barras y no empieza por punto. */
create or replace function public.is_safe_object_path(p_path text, p_prefix text) returns boolean
language sql immutable set search_path = '' as $$
  select p_path is not null
    and left(p_path, length(p_prefix) + 1) = p_prefix || '/'
    and substr(p_path, length(p_prefix) + 2) ~ '^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$'
$$;

revoke execute on function public.is_safe_object_path from public, anon, authenticated;

drop function public.set_version_files(uuid, text, text, bigint, text, text, text, bigint);

create function public.set_version_files(
  p_actor uuid, p_version uuid, p_pdf_path text, p_pdf_sha256 text, p_pdf_size bigint,
  p_source_path text, p_source_sha256 text, p_source_name text, p_source_size bigint
) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents; v_prefix text;
begin
  v := public.version_or_fail(p_version);
  select * into d from public.documents where id = v.document_id;
  if p_actor is null or not public.is_member_of(d.organization_id, p_actor)
    or (public.position_of(d.organization_id, p_actor) is distinct from d.elaborador_position_id
        and v.elaborated_by is distinct from p_actor) then
    raise exception 'Solo el cargo elaborador puede adjuntar archivos' using errcode = '42501';
  end if;
  if v.status <> 'borrador' then
    raise exception 'Solo se reemplazan archivos de una versión en borrador' using errcode = '22023';
  end if;
  v_prefix := d.organization_id || '/' || d.id || '/' || v.id;
  if not public.is_safe_object_path(p_pdf_path, v_prefix) or p_pdf_path !~* '\.pdf$'
    or not public.is_safe_object_path(p_source_path, v_prefix) or p_source_path = p_pdf_path then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  if coalesce(p_pdf_sha256, '') !~ '^[0-9a-f]{64}$' or coalesce(p_source_sha256, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_pdf_size, 0) not between 1 and 26214400 or coalesce(p_source_size, 0) not between 1 and 26214400 then
    raise exception 'Archivo inválido' using errcode = '22023';
  end if;
  update public.document_versions set
    pdf_path = p_pdf_path, pdf_sha256 = p_pdf_sha256, pdf_size = p_pdf_size,
    source_path = p_source_path, source_sha256 = p_source_sha256,
    source_file_name = left(p_source_name, 255), source_size = p_source_size
  where id = p_version;
  perform public.log_event(d.organization_id, 'adjuntar_archivos', 'Documento', d.id,
    d.code || ' v' || v.version_no, jsonb_build_object('pdf_sha256', p_pdf_sha256, 'source_sha256', p_source_sha256), p_actor);
end $$;

revoke execute on function public.set_version_files from public, anon, authenticated;
grant execute on function public.set_version_files to service_role;

drop function public.register_evidence(uuid, date, text, text, text, text, text);

/** Solo el cargo responsable registra evidencia; recalcula la próxima ejecución. */
create function public.register_evidence(
  p_actor uuid, p_control uuid, p_executed_at date, p_result text, p_notes text,
  p_file_path text default null, p_file_sha256 text default null, p_file_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.controls; r public.risks; v_id uuid;
begin
  select * into c from public.controls where id = p_control;
  if c.id is null then raise exception 'Control no encontrado' using errcode = 'P0002'; end if;
  select * into r from public.risks where id = c.risk_id;
  if p_actor is null or public.position_of(c.organization_id, p_actor) is distinct from c.responsible_position_id then
    raise exception 'Solo el cargo responsable registra evidencia de este control' using errcode = '42501';
  end if;
  -- `<org>/<control>/<uuid>/<archivo>`
  if p_file_path is not null and (
    split_part(p_file_path, '/', 3) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or not public.is_safe_object_path(p_file_path, c.organization_id || '/' || c.id || '/' || split_part(p_file_path, '/', 3))
    or coalesce(p_file_sha256, '') !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  if p_file_path is null and p_file_sha256 is not null then
    raise exception 'Archivo inválido' using errcode = '22023';
  end if;
  insert into public.control_evidences (organization_id, control_id, executed_at, result, notes,
    file_path, file_sha256, file_name, registered_by)
  values (c.organization_id, c.id, p_executed_at, p_result, trim(coalesce(p_notes, '')),
    p_file_path, p_file_sha256, left(p_file_name, 255), p_actor)
  returning id into v_id;
  update public.controls set next_due_date = coalesce(
    (p_executed_at + public.frequency_interval(c.frequency))::date, c.next_due_date)
  where id = c.id;
  perform public.complete_tasks('ejecutar_control', c.id, null, p_actor);
  perform public.log_event(c.organization_id, 'registrar_evidencia', 'Control', c.id, r.code,
    jsonb_build_object('resultado', p_result, 'ejecutado', p_executed_at, 'file_sha256', p_file_sha256), p_actor);
  return v_id;
end $$;

revoke execute on function public.register_evidence from public, anon, authenticated;
grant execute on function public.register_evidence to service_role;

update storage.buckets set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
] where id = 'evidencias';
