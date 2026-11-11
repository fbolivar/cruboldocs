-- 033 — Constructor de formularios / listas de verificación configurables. Arquitectura:
-- docs/formularios/ARQUITECTURA.md, ADR-046/047/048. Motor genérico: plantilla (form_templates) con
-- campos versionados (form_fields, 9 tipos) + respuestas (form_submissions) y valores (submission_values,
-- jsonb validado en el servidor). Versionado por CLONACIÓN al publicar (ADR-047): la plantilla publicada
-- se congela; editar clona los campos en un borrador vN+1; las respuestas guardan su versión.
-- MVP interno (ADR-048): diligencia cualquier miembro activo (vía RPC definer); gestión por rol SIG.
-- Baja lógica en form_fields (is_active); sin DELETE. NOTA: aplicada por fragmentos; archivo = SQL final.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  description text,
  category text not null check (category in ('inspeccion','lista_verificacion','formato','encuesta_interna','otro')),
  process_id uuid,
  status text not null default 'borrador' check (status in ('borrador','publicado','archivado')),
  published_version int,
  draft_version int not null default 1,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  template_id uuid not null,
  version int not null,
  order_index int not null default 0,
  type text not null check (type in ('texto','texto_largo','numero','fecha','si_no','seleccion','multiseleccion','puntaje','seccion')),
  label text not null check (length(trim(label)) between 1 and 300),
  help text,
  required boolean not null default false,
  options jsonb,
  config jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (template_id, organization_id) references public.form_templates (id, organization_id) on delete cascade
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  template_id uuid not null,
  template_version int not null,
  status text not null default 'borrador' check (status in ('borrador','enviada')),
  submitted_by uuid not null default auth.uid(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (template_id, organization_id) references public.form_templates (id, organization_id) on delete cascade
);

create table public.submission_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  submission_id uuid not null,
  field_id uuid not null,
  value jsonb,
  unique (submission_id, field_id),
  unique (id, organization_id),
  foreign key (submission_id, organization_id) references public.form_submissions (id, organization_id) on delete cascade,
  foreign key (field_id, organization_id) references public.form_fields (id, organization_id)
);

create table public.form_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.form_templates (organization_id, status);
create index on public.form_templates (process_id, organization_id);
create index on public.form_fields (template_id, version, organization_id);
create index on public.form_submissions (template_id, organization_id);
create index on public.submission_values (submission_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_forms(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_forms(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_forms, public.can_manage_forms from public, anon;
grant execute on function public.can_see_forms, public.can_manage_forms to authenticated;

alter table public.form_templates enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.submission_values enable row level security;
alter table public.form_counters enable row level security; -- deny-all

create policy form_template_select on public.form_templates for select to authenticated using (public.can_see_forms(organization_id));
create policy form_field_select on public.form_fields for select to authenticated using (public.can_see_forms(organization_id));
create policy form_submission_select on public.form_submissions for select to authenticated using (public.can_see_forms(organization_id));
create policy submission_value_select on public.submission_values for select to authenticated using (public.can_see_forms(organization_id));

-- ---------------------------------------------------------------------------
-- RPCs — ciclo de vida de plantillas y campos (fragmento 033b)
-- ---------------------------------------------------------------------------

create or replace function public.create_template(
  p_org uuid, p_title text, p_category text, p_process uuid, p_description text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_forms(p_org, p_process) then
    raise exception 'No puedes crear plantillas' using errcode = '42501';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.form_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.form_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'FORM-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.form_templates (organization_id, code, title, category, process_id, description, status, draft_version, created_by)
  values (p_org, v_code, trim(p_title), p_category, p_process, nullif(trim(coalesce(p_description, '')), ''), 'borrador', 1, auth.uid())
  returning form_templates.id into v_id;
  perform public.log_event(p_org, 'crear_plantilla', 'Formulario', v_id, v_code, jsonb_build_object('categoria', p_category));
  return query select v_id, v_code;
end $$;

create or replace function public.template_or_fail(p_template uuid) returns public.form_templates
language plpgsql stable security definer set search_path = '' as $$
declare t public.form_templates;
begin
  select * into t from public.form_templates where id = p_template;
  if t.id is null or not public.is_active_member(t.organization_id) then
    raise exception 'Plantilla no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return t;
end $$;

create or replace function public.template_has_open_draft(t public.form_templates) returns boolean
language sql immutable set search_path = '' as $$
  select t.status <> 'archivado' and (t.status = 'borrador' or t.draft_version > coalesce(t.published_version, 0))
$$;

create or replace function public.update_template_data(
  p_template uuid, p_title text, p_category text, p_process uuid, p_description text
) returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes editar esta plantilla' using errcode = '42501';
  end if;
  if t.status = 'archivado' then
    raise exception 'La plantilla archivada ya no es editable' using errcode = '22023';
  end if;
  update public.form_templates set
    title = trim(p_title), category = p_category, process_id = p_process,
    description = nullif(trim(coalesce(p_description, '')), ''), updated_at = now()
  where id = t.id;
  perform public.log_event(t.organization_id, 'editar_plantilla', 'Formulario', t.id, t.code, '{}');
end $$;

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
  if p_type not in ('texto','texto_largo','numero','fecha','si_no','seleccion','multiseleccion','puntaje','seccion') then
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

create or replace function public.field_template(p_field uuid) returns public.form_templates
language plpgsql stable security definer set search_path = '' as $$
declare f public.form_fields; t public.form_templates;
begin
  select * into f from public.form_fields where id = p_field;
  if f.id is null or not public.is_active_member(f.organization_id) then
    raise exception 'Campo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  select * into t from public.form_templates where id = f.template_id;
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes editar esta plantilla' using errcode = '42501';
  end if;
  if not public.template_has_open_draft(t) or f.version <> t.draft_version then
    raise exception 'Este campo pertenece a una versión publicada' using errcode = '22023';
  end if;
  return t;
end $$;

create or replace function public.update_field(
  p_field uuid, p_label text, p_help text, p_required boolean, p_options jsonb, p_config jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates;
begin
  t := public.field_template(p_field);
  update public.form_fields set
    label = trim(coalesce(nullif(trim(coalesce(p_label,'')),''), 'Campo sin título')),
    help = nullif(trim(coalesce(p_help, '')), ''), required = coalesce(p_required, false),
    options = p_options, config = p_config
  where id = p_field;
  update public.form_templates set updated_at = now() where id = t.id;
end $$;

create or replace function public.remove_field(p_field uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates;
begin
  t := public.field_template(p_field);
  update public.form_fields set is_active = false where id = p_field;
  update public.form_templates set updated_at = now() where id = t.id;
end $$;

create or replace function public.set_field_order(p_template uuid, p_field_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; i int;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes editar esta plantilla' using errcode = '42501';
  end if;
  if not public.template_has_open_draft(t) then
    raise exception 'Crea una nueva versión para reordenar' using errcode = '22023';
  end if;
  for i in 1 .. coalesce(array_length(p_field_ids, 1), 0) loop
    update public.form_fields set order_index = i
    where id = p_field_ids[i] and template_id = t.id and version = t.draft_version and organization_id = t.organization_id;
  end loop;
  update public.form_templates set updated_at = now() where id = t.id;
end $$;

create or replace function public.publish_template(p_template uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; n int;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes publicar esta plantilla' using errcode = '42501';
  end if;
  if not public.template_has_open_draft(t) then
    raise exception 'No hay un borrador por publicar' using errcode = '22023';
  end if;
  select count(*) into n from public.form_fields where template_id = t.id and version = t.draft_version and is_active and type <> 'seccion';
  if n = 0 then
    raise exception 'Agrega al menos un campo antes de publicar' using errcode = '22023';
  end if;
  update public.form_templates set status = 'publicado', published_version = t.draft_version, published_at = now(), updated_at = now() where id = t.id;
  perform public.log_event(t.organization_id, 'publicar_plantilla', 'Formulario', t.id, t.code, jsonb_build_object('version', t.draft_version));
end $$;

create or replace function public.new_template_version(p_template uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; v_new int;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes versionar esta plantilla' using errcode = '42501';
  end if;
  if t.status <> 'publicado' or t.draft_version <> t.published_version then
    raise exception 'Solo una plantilla publicada sin borrador abierto puede versionarse' using errcode = '22023';
  end if;
  v_new := t.published_version + 1;
  insert into public.form_fields (organization_id, template_id, version, order_index, type, label, help, required, options, config)
  select organization_id, template_id, v_new, order_index, type, label, help, required, options, config
  from public.form_fields where template_id = t.id and version = t.published_version and is_active;
  update public.form_templates set draft_version = v_new, updated_at = now() where id = t.id;
  perform public.log_event(t.organization_id, 'nueva_version_plantilla', 'Formulario', t.id, t.code, jsonb_build_object('version', v_new));
end $$;

create or replace function public.set_template_archived(p_template uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.form_templates;
begin
  t := public.template_or_fail(p_template);
  if not public.can_manage_forms(t.organization_id, t.process_id) then
    raise exception 'No puedes archivar esta plantilla' using errcode = '42501';
  end if;
  update public.form_templates set
    status = case when p_archived then 'archivado' when t.published_version is not null then 'publicado' else 'borrador' end,
    updated_at = now()
  where id = t.id;
  perform public.log_event(t.organization_id, 'estado_plantilla', 'Formulario', t.id, t.code, jsonb_build_object('archivada', p_archived));
end $$;

revoke execute on function public.template_or_fail, public.template_has_open_draft, public.field_template from public, anon, authenticated;
revoke execute on function public.create_template, public.update_template_data, public.add_field, public.update_field,
  public.remove_field, public.set_field_order, public.publish_template, public.new_template_version, public.set_template_archived from public, anon;
grant execute on function public.create_template, public.update_template_data, public.add_field, public.update_field,
  public.remove_field, public.set_field_order, public.publish_template, public.new_template_version, public.set_template_archived to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs — respuestas con validación server-side (fragmento 033c)
-- ---------------------------------------------------------------------------

create or replace function public.get_published_form(p_template uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t public.form_templates; v_fields jsonb;
begin
  select * into t from public.form_templates where id = p_template;
  if t.id is null or not public.is_active_member(t.organization_id) then
    raise exception 'Formulario no disponible' using errcode = 'P0002';
  end if;
  if t.status <> 'publicado' or t.published_version is null then
    raise exception 'Este formulario no está disponible para diligenciar' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(f order by f.order_index), '[]'::jsonb) into v_fields
  from (
    select id, order_index, type, label, help, required, options, config
    from public.form_fields
    where template_id = t.id and version = t.published_version and is_active
    order by order_index
  ) f;
  return jsonb_build_object(
    'id', t.id, 'code', t.code, 'title', t.title, 'category', t.category,
    'version', t.published_version, 'fields', v_fields
  );
end $$;

create or replace function public.validate_submission_values(
  p_template uuid, p_version int, p_values jsonb, p_require boolean
) returns void language plpgsql stable security definer set search_path = '' as $$
declare f record; v jsonb; n numeric; vmin numeric; vmax numeric; sel jsonb;
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
    end if;
  end loop;
end $$;

create or replace function public.save_submission_draft(
  p_submission uuid, p_template uuid, p_values jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; s public.form_submissions; v_id uuid; k text; fld record;
begin
  select * into t from public.form_templates where id = p_template;
  if t.id is null or not public.is_active_member(t.organization_id) then
    raise exception 'Formulario no disponible' using errcode = 'P0002';
  end if;
  if t.status <> 'publicado' or t.published_version is null then
    raise exception 'Este formulario no está disponible para diligenciar' using errcode = '22023';
  end if;
  if p_submission is not null then
    select * into s from public.form_submissions where id = p_submission;
    if s.id is null or s.organization_id <> t.organization_id or s.submitted_by <> auth.uid() then
      raise exception 'Respuesta no encontrada' using errcode = 'P0002';
    end if;
    if s.status <> 'borrador' then
      raise exception 'La respuesta ya fue enviada' using errcode = '22023';
    end if;
    v_id := s.id;
  else
    insert into public.form_submissions (organization_id, template_id, template_version, status)
    values (t.organization_id, t.id, t.published_version, 'borrador')
    returning form_submissions.id into v_id;
  end if;
  delete from public.submission_values where submission_id = v_id;
  for fld in
    select id from public.form_fields where template_id = t.id and version = t.published_version and is_active and type <> 'seccion'
  loop
    k := fld.id::text;
    if p_values ? k and (p_values -> k) is not null and (p_values -> k) <> 'null'::jsonb then
      insert into public.submission_values (organization_id, submission_id, field_id, value)
      values (t.organization_id, v_id, fld.id, p_values -> k);
    end if;
  end loop;
  return v_id;
end $$;

create or replace function public.submit_submission(p_submission uuid, p_values jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.form_submissions; t public.form_templates; v_id uuid;
begin
  v_id := public.save_submission_draft(p_submission, (
    select template_id from public.form_submissions where id = p_submission
  ), p_values);
  select * into s from public.form_submissions where id = v_id;
  select * into t from public.form_templates where id = s.template_id;
  perform public.validate_submission_values(t.id, s.template_version, p_values, true);
  update public.form_submissions set status = 'enviada', submitted_at = now() where id = v_id;
  perform public.log_event(t.organization_id, 'enviar_respuesta', 'Formulario', t.id, t.code, jsonb_build_object('submission', v_id));
end $$;

create or replace function public.submit_new_submission(p_template uuid, p_values jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.form_templates; v_id uuid;
begin
  select * into t from public.form_templates where id = p_template;
  if t.id is null or not public.is_active_member(t.organization_id) then
    raise exception 'Formulario no disponible' using errcode = 'P0002';
  end if;
  perform public.validate_submission_values(t.id, coalesce(t.published_version, t.draft_version), p_values, true);
  v_id := public.save_submission_draft(null, p_template, p_values);
  update public.form_submissions set status = 'enviada', submitted_at = now() where id = v_id;
  perform public.log_event(t.organization_id, 'enviar_respuesta', 'Formulario', t.id, t.code, jsonb_build_object('submission', v_id));
  return v_id;
end $$;

revoke execute on function public.validate_submission_values from public, anon, authenticated;
revoke execute on function public.get_published_form, public.save_submission_draft, public.submit_submission, public.submit_new_submission from public, anon;
grant execute on function public.get_published_form, public.save_submission_draft, public.submit_submission, public.submit_new_submission to authenticated;

-- ---------------------------------------------------------------------------
-- RPC — resolver formulario publicado por código (fragmento 033d)
-- Permite diligenciar a cualquier miembro activo sin exponer la RLS de form_templates.
-- ---------------------------------------------------------------------------

create or replace function public.get_published_form_by_code(p_org uuid, p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso' using errcode = 'P0002';
  end if;
  select id into v_id from public.form_templates where organization_id = p_org and code = p_code;
  if v_id is null then
    raise exception 'Formulario no disponible' using errcode = 'P0002';
  end if;
  return public.get_published_form(v_id);
end $$;

revoke execute on function public.get_published_form_by_code from public, anon;
grant execute on function public.get_published_form_by_code to authenticated;
