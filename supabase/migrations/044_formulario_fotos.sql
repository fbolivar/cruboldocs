-- 044 — PWA con foto / inspecciones móviles (v1.3-4). Arquitectura: docs/pwa-foto/ARQUITECTURA.md,
-- ADR-070/071/072. Bucket privado de fotos (subida solo-servidor, reusa createUploadTicket/promoteUpload),
-- nuevo tipo de campo 'imagen' en el constructor, y validación del valor (lista de rutas del org).

-- 044a · Bucket y lectura
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-photos', 'form-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- form-photos/<org>/<template>/<archivo>: cualquier miembro activo de la organización de la ruta.
create or replace function public.storage_can_read_form_photo(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(p_name, '/'); v_org uuid;
begin
  if array_length(parts, 1) <> 3 then return false; end if;
  begin
    v_org := parts[1]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.is_active_member(v_org);
end $$;

revoke execute on function public.storage_can_read_form_photo from public, anon;
grant execute on function public.storage_can_read_form_photo to authenticated;

create policy form_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'form-photos' and public.storage_can_read_form_photo(name));

-- 044b · Tipo de campo 'imagen'
alter table public.form_fields drop constraint if exists form_fields_type_check;
alter table public.form_fields add constraint form_fields_type_check
  check (type in ('texto','texto_largo','numero','fecha','si_no','seleccion','multiseleccion','puntaje','seccion','imagen'));

-- 044c · add_field acepta 'imagen'
create or replace function public.add_field(p_template uuid, p_type text, p_label text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; v_id uuid; v_order int;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes editar esta plantilla' using errcode = '42501';
  end if;
  if not public.template_has_open_draft(t) then
    raise exception 'Crea una nueva versión para editar una plantilla publicada' using errcode = '22023';
  end if;
  if p_type not in ('texto','texto_largo','numero','fecha','si_no','seleccion','multiseleccion','puntaje','seccion','imagen') then
    raise exception 'Tipo de campo no válido' using errcode = '22023';
  end if;
  select coalesce(max(order_index), 0) + 1 into v_order from public.form_fields
    where template_id = t.id and version = t.draft_version and is_active;
  insert into public.form_fields (organization_id, template_id, version, order_index, type, label)
  values (t.organization_id, t.id, t.draft_version, v_order, p_type, trim(coalesce(nullif(trim(coalesce(p_label,'')),''), 'Campo sin título')))
  returning form_fields.id into v_id;
  update public.form_templates set updated_at = now() where id = t.id;
  return v_id;
end $$;

-- 044d · validate_submission_values valida 'imagen' (lista de rutas del org, cantidad <= max)
create or replace function public.validate_submission_values(
  p_template uuid, p_version int, p_values jsonb, p_require boolean
) returns void language plpgsql stable security definer set search_path = '' as $$
declare f record; v jsonb; n numeric; vmin numeric; vmax numeric; sel jsonb; v_max int; v_prefix text;
begin
  for f in
    select * from public.form_fields
    where template_id = p_template and version = p_version and is_active and type <> 'seccion'
    order by order_index
  loop
    v := p_values -> f.id::text;
    if v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and length(btrim(v #>> '{}')) = 0)
       or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0) then
      if p_require and f.required then
        raise exception 'El campo "%" es obligatorio', f.label using errcode = '23514';
      end if;
      continue;
    end if;
    if f.type in ('texto','texto_largo') then
      if jsonb_typeof(v) <> 'string' then raise exception 'El campo "%" debe ser texto', f.label using errcode = '22023'; end if;
      if length(v #>> '{}') > 5000 then raise exception 'El campo "%" excede la longitud permitida', f.label using errcode = '22023'; end if;
    elsif f.type in ('numero','puntaje') then
      if jsonb_typeof(v) <> 'number' then raise exception 'El campo "%" debe ser numérico', f.label using errcode = '22023'; end if;
      n := (v #>> '{}')::numeric;
      vmin := nullif(f.config ->> 'min', '')::numeric;
      vmax := nullif(f.config ->> 'max', '')::numeric;
      if f.type = 'puntaje' then vmin := coalesce(vmin, 0); vmax := coalesce(vmax, 100); end if;
      if vmin is not null and n < vmin then raise exception 'El campo "%" es menor que el mínimo (%)', f.label, vmin using errcode = '22023'; end if;
      if vmax is not null and n > vmax then raise exception 'El campo "%" supera el máximo (%)', f.label, vmax using errcode = '22023'; end if;
    elsif f.type = 'fecha' then
      if jsonb_typeof(v) <> 'string' then raise exception 'El campo "%" debe ser una fecha', f.label using errcode = '22023'; end if;
      begin perform (v #>> '{}')::date; exception when others then
        raise exception 'El campo "%" no es una fecha válida', f.label using errcode = '22023'; end;
    elsif f.type = 'si_no' then
      if not (jsonb_typeof(v) = 'boolean' or (v #>> '{}') in ('si','no','sí')) then
        raise exception 'El campo "%" debe ser Sí o No', f.label using errcode = '22023'; end if;
    elsif f.type = 'seleccion' then
      if jsonb_typeof(v) <> 'string' then raise exception 'El campo "%" tiene un valor no válido', f.label using errcode = '22023'; end if;
      if not exists (select 1 from jsonb_array_elements_text(coalesce(f.options, '[]'::jsonb)) o where o = v #>> '{}') then
        raise exception 'La opción elegida en "%" no es válida', f.label using errcode = '22023'; end if;
    elsif f.type = 'multiseleccion' then
      if jsonb_typeof(v) <> 'array' then raise exception 'El campo "%" tiene un valor no válido', f.label using errcode = '22023'; end if;
      for sel in select value from jsonb_array_elements(v) loop
        if jsonb_typeof(sel) <> 'string' or not exists (
          select 1 from jsonb_array_elements_text(coalesce(f.options, '[]'::jsonb)) o where o = sel #>> '{}'
        ) then raise exception 'Una opción de "%" no es válida', f.label using errcode = '22023'; end if;
      end loop;
    elsif f.type = 'imagen' then
      if jsonb_typeof(v) <> 'array' then raise exception 'El campo "%" tiene un valor no válido', f.label using errcode = '22023'; end if;
      v_max := least(greatest(coalesce(nullif(f.config ->> 'max', '')::int, 3), 1), 10);
      if jsonb_array_length(v) > v_max then
        raise exception 'El campo "%" admite hasta % fotos', f.label, v_max using errcode = '22023'; end if;
      v_prefix := f.organization_id::text || '/' || p_template::text || '/';
      for sel in select value from jsonb_array_elements(v) loop
        if jsonb_typeof(sel) <> 'string' or left(sel #>> '{}', length(v_prefix)) <> v_prefix then
          raise exception 'Una foto de "%" no es válida', f.label using errcode = '22023'; end if;
      end loop;
    end if;
  end loop;
end $$;
