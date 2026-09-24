-- 003 · Control documental: tipos, documentos, versiones inmutables, comentarios,
-- solicitudes de cambio, confirmación de lectura y firmas (ADR-004).
-- Las escrituras del flujo van por funciones que validan rol, estado y segregación;
-- los clientes no tienen políticas de escritura directa sobre estas tablas.

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null check (code ~ '^[A-Z]{2,3}$'),
  name text not null check (length(trim(name)) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  process_id uuid not null,
  type_id uuid not null,
  code text not null check (code ~ '^[A-Z0-9]{2,6}(-[A-Z0-9]{2,6})*-\d{3}$'),
  title text not null check (length(trim(title)) between 3 and 200),
  status text not null default 'borrador'
    check (status in ('borrador', 'en_revision', 'en_aprobacion', 'vigente', 'obsoleto')),
  -- Versión aprobada en uso (null hasta la primera aprobación).
  current_version_id uuid,
  elaborador_position_id uuid not null,
  revisor_position_id uuid not null,
  aprobador_position_id uuid not null,
  review_every_months int not null default 12 check (review_every_months between 1 and 60),
  next_review_date date,
  read_required boolean not null default true,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (type_id, organization_id) references public.document_types (id, organization_id),
  foreign key (elaborador_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (revisor_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (aprobador_position_id, organization_id) references public.positions (id, organization_id),
  -- Segregación de funciones por cargo.
  check (
    elaborador_position_id <> revisor_position_id
    and elaborador_position_id <> aprobador_position_id
    and revisor_position_id <> aprobador_position_id
  )
);

create table public.document_distribution (
  organization_id uuid not null references public.organizations on delete cascade,
  document_id uuid not null,
  position_id uuid not null,
  primary key (document_id, position_id),
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete cascade,
  foreign key (position_id, organization_id) references public.positions (id, organization_id)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  document_id uuid not null,
  version_no int not null check (version_no >= 1),
  status text not null default 'borrador'
    check (status in ('borrador', 'en_revision', 'en_aprobacion', 'aprobada', 'reemplazada')),
  change_summary text not null default '' check (length(change_summary) <= 1000),
  -- Rutas en Storage (bucket privado "documentos"): <org>/<doc>/<version>/<archivo>.
  pdf_path text,
  pdf_sha256 text check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  pdf_size bigint check (pdf_size <= 26214400),
  source_path text,
  source_sha256 text check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_file_name text,
  source_size bigint check (source_size <= 26214400),
  elaborated_by uuid not null references public.profiles,
  reviewed_by uuid references public.profiles,
  approved_by uuid references public.profiles,
  approved_at timestamptz,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, version_no),
  unique (id, organization_id),
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete cascade
);

comment on table public.document_versions is 'Dato sensible. Inmutable al aprobarse (trigger). Una sola versión en curso por documento.';

-- Una sola versión en flujo (no aprobada ni reemplazada) por documento.
create unique index document_versions_one_open on public.document_versions (document_id)
  where status in ('borrador', 'en_revision', 'en_aprobacion');

alter table public.documents
  add foreign key (current_version_id, organization_id) references public.document_versions (id, organization_id);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  version_id uuid not null,
  author_id uuid not null references public.profiles,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles,
  foreign key (version_id, organization_id) references public.document_versions (id, organization_id) on delete cascade
);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  document_id uuid not null,
  requested_by uuid not null references public.profiles,
  reason text not null check (length(trim(reason)) between 10 and 2000),
  status text not null default 'abierta' check (status in ('abierta', 'aceptada', 'rechazada')),
  resolved_by uuid references public.profiles,
  resolved_at timestamptz,
  resolution text check (length(resolution) <= 2000),
  new_version_id uuid,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete cascade,
  foreign key (new_version_id, organization_id) references public.document_versions (id, organization_id)
);

create table public.read_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  version_id uuid not null,
  user_id uuid not null references public.profiles,
  acknowledged_at timestamptz not null default now(),
  unique (version_id, user_id),
  foreign key (version_id, organization_id) references public.document_versions (id, organization_id) on delete cascade
);

create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  version_id uuid not null,
  signer_id uuid not null references public.profiles,
  action text not null check (action in ('revision', 'aprobacion')),
  meaning text not null,
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  reauth_at timestamptz not null,
  ip inet,
  user_agent text,
  signature_hash text not null,
  signed_at timestamptz not null default now(),
  unique (version_id, action),
  foreign key (version_id, organization_id) references public.document_versions (id, organization_id)
);

comment on table public.signatures is 'Dato sensible. Solo inserción. Firma electrónica simple: reautenticación + registro + hash (ADR-004).';

create index on public.document_types (organization_id);
create index on public.documents (organization_id);
create index on public.documents (organization_id, process_id);
create index on public.document_distribution (organization_id);
create index on public.document_versions (organization_id);
create index on public.document_versions (document_id);
create index on public.review_comments (organization_id);
create index on public.review_comments (version_id);
create index on public.change_requests (organization_id);
create index on public.change_requests (document_id);
create index on public.read_acknowledgements (organization_id);
create index on public.signatures (organization_id);
create index on public.signatures (version_id);

create trigger t_touch before update on public.documents for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.document_versions for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Reglas de integridad en la base (no solo en la UI)
-- ---------------------------------------------------------------------------

/** Versión aprobada = inmutable. Única transición permitida: aprobada → reemplazada. */
create or replace function public.guard_version_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('aprobada', 'reemplazada') then
      raise exception 'Una versión aprobada no se puede eliminar' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status = 'reemplazada' then
    raise exception 'Una versión reemplazada es inmutable' using errcode = '42501';
  end if;
  if old.status = 'aprobada' then
    if new.status <> 'reemplazada'
      or (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Una versión aprobada es inmutable' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger t_immutable before update or delete on public.document_versions
  for each row execute function public.guard_version_immutable();

/** Segregación por persona: quien elabora no revisa ni aprueba; quien revisa no aprueba. */
create or replace function public.guard_signature() returns trigger
language plpgsql set search_path = '' as $$
declare v public.document_versions;
begin
  select * into v from public.document_versions where id = new.version_id;
  if new.signer_id = v.elaborated_by then
    raise exception 'No puedes firmar un documento que elaboraste' using errcode = '42501';
  end if;
  if new.action = 'aprobacion' and new.signer_id = v.reviewed_by then
    raise exception 'No puedes aprobar un documento que revisaste' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger t_guard before insert on public.signatures
  for each row execute function public.guard_signature();
create trigger t_immutable before update or delete on public.signatures
  for each row execute function public.forbid_change();
create trigger t_immutable before update or delete on public.read_acknowledgements
  for each row execute function public.forbid_change();

-- ---------------------------------------------------------------------------
-- Visibilidad
-- ---------------------------------------------------------------------------

/** Participa en el flujo del documento o lo supervisa (líderes, auditor, admin de metadatos). */
create or replace function public.is_document_participant(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc
      and public.is_active_member(d.organization_id)
      and (
        public.my_position(d.organization_id) in (d.elaborador_position_id, d.revisor_position_id, d.aprobador_position_id)
        or public.has_role(d.organization_id, 'lider_sig')
        or public.has_role(d.organization_id, 'lider_proceso', d.process_id)
        or public.has_role(d.organization_id, 'auditor')
        or public.is_org_admin(d.organization_id)
      )
  )
$$;

/** Documento visible: tiene versión vigente o el usuario participa. */
create or replace function public.can_see_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc
      and public.is_active_member(d.organization_id)
      and (d.current_version_id is not null or public.is_document_participant(d.id))
  ) or exists (select 1 from public.documents d where d.id = p_doc and public.is_platform_admin())
$$;

/** Versión visible: las aprobadas/reemplazadas para quien ve el documento; las en curso solo participantes. */
create or replace function public.can_see_version(p_version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.document_versions v
    where v.id = p_version
      and public.can_see_document(v.document_id)
      and (v.status in ('aprobada', 'reemplazada') or public.is_document_participant(v.document_id))
  )
$$;

revoke execute on function public.is_document_participant, public.can_see_document, public.can_see_version from public, anon;
grant execute on function public.is_document_participant, public.can_see_document, public.can_see_version to authenticated;
revoke execute on function public.guard_version_immutable, public.guard_signature from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.document_distribution enable row level security;
alter table public.document_versions enable row level security;
alter table public.review_comments enable row level security;
alter table public.change_requests enable row level security;
alter table public.read_acknowledgements enable row level security;
alter table public.signatures enable row level security;

create policy doctype_select on public.document_types for select to authenticated
  using (public.is_active_member(organization_id) or public.is_platform_admin());
create policy doctype_write on public.document_types for all to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy document_select on public.documents for select to authenticated
  using (public.can_see_document(id));
create policy distribution_select on public.document_distribution for select to authenticated
  using (public.can_see_document(document_id));
create policy version_select on public.document_versions for select to authenticated
  using (public.can_see_version(id));
-- Comentarios: describen el contenido; el Admin sin rol funcional no los ve (decisión 2026-09-23).
create policy comment_select on public.review_comments for select to authenticated
  using (public.can_see_version(version_id) and public.can_view_content(organization_id));
create policy change_request_select on public.change_requests for select to authenticated
  using (public.can_see_document(document_id));
create policy read_ack_select on public.read_acknowledgements for select to authenticated
  using (public.can_see_version(version_id));
create policy signature_select on public.signatures for select to authenticated
  using (public.can_see_version(version_id));

-- ---------------------------------------------------------------------------
-- Flujo del documento (funciones con validación de rol, estado y segregación)
-- ---------------------------------------------------------------------------

create or replace function public.doc_or_fail(p_doc uuid) returns public.documents
language plpgsql stable security definer set search_path = '' as $$
declare d public.documents;
begin
  select * into d from public.documents where id = p_doc;
  if d.id is null or not public.is_active_member(d.organization_id) then
    raise exception 'Documento no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return d;
end $$;

create or replace function public.version_or_fail(p_version uuid) returns public.document_versions
language plpgsql stable security definer set search_path = '' as $$
declare v public.document_versions;
begin
  select * into v from public.document_versions where id = p_version;
  if v.id is null then
    raise exception 'Versión no encontrada' using errcode = 'P0002';
  end if;
  return v;
end $$;

/** Registra un documento nuevo con su versión 1 en borrador (sin archivos aún). */
create or replace function public.create_document(
  p_id uuid, p_org uuid, p_process uuid, p_type uuid, p_code text, p_title text,
  p_elaborador uuid, p_revisor uuid, p_aprobador uuid, p_distribution uuid[],
  p_read_required boolean, p_review_months int, p_change_summary text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_version uuid;
begin
  if not (
    public.has_role(p_org, 'elaborador', p_process)
    or public.has_role(p_org, 'lider_sig')
    or public.has_role(p_org, 'lider_proceso', p_process)
  ) then
    raise exception 'Tu cargo no puede registrar documentos en este proceso' using errcode = '42501';
  end if;

  insert into public.documents (
    id, organization_id, process_id, type_id, code, title, elaborador_position_id, revisor_position_id,
    aprobador_position_id, review_every_months, read_required, created_by
  ) values (
    p_id, p_org, p_process, p_type, upper(trim(p_code)), trim(p_title), p_elaborador, p_revisor,
    p_aprobador, p_review_months, p_read_required, auth.uid()
  );

  insert into public.document_distribution (organization_id, document_id, position_id)
  select p_org, p_id, unnest(coalesce(p_distribution, '{}'));

  insert into public.document_versions (organization_id, document_id, version_no, change_summary, elaborated_by)
  values (p_org, p_id, 1, coalesce(p_change_summary, ''), auth.uid())
  returning id into v_version;

  perform public.log_event(p_org, 'registrar_documento', 'Documento', p_id, upper(trim(p_code)),
    jsonb_build_object('titulo', trim(p_title)));
  return v_version;
end $$;

/** Adjunta o reemplaza los archivos de una versión en borrador (hash calculado en servidor). */
create or replace function public.set_version_files(
  p_version uuid, p_pdf_path text, p_pdf_sha256 text, p_pdf_size bigint,
  p_source_path text, p_source_sha256 text, p_source_name text, p_source_size bigint
) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  if public.my_position(d.organization_id) is distinct from d.elaborador_position_id then
    raise exception 'Solo el cargo elaborador puede adjuntar archivos' using errcode = '42501';
  end if;
  if v.status <> 'borrador' then
    raise exception 'Solo se reemplazan archivos de una versión en borrador' using errcode = '22023';
  end if;
  if split_part(p_pdf_path, '/', 1) <> d.organization_id::text or split_part(p_pdf_path, '/', 3) <> v.id::text then
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
  if public.my_position(d.organization_id) is distinct from d.elaborador_position_id then
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

/** Devolver (revisor) o rechazar (aprobador): vuelve a borrador con el motivo como comentario. */
create or replace function public.return_version(p_version uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents; v_pos uuid; v_action text;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  v_pos := public.my_position(d.organization_id);
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Explica el motivo en al menos 10 caracteres' using errcode = '22023';
  end if;
  if v.status = 'en_revision' and v_pos = d.revisor_position_id then
    v_action := 'devolver';
    perform public.complete_tasks('revisar', v.id);
  elsif v.status = 'en_aprobacion' and v_pos = d.aprobador_position_id then
    v_action := 'rechazar';
    perform public.complete_tasks('aprobar', v.id);
  else
    raise exception 'No puedes devolver esta versión' using errcode = '42501';
  end if;

  update public.document_versions set status = 'borrador', reviewed_by = null where id = v.id;
  update public.documents set status = case when current_version_id is null then 'borrador' else 'vigente' end
  where id = d.id;
  insert into public.review_comments (organization_id, version_id, author_id, body)
  values (d.organization_id, v.id, auth.uid(), trim(p_reason));
  perform public.create_task(d.organization_id, 'corregir', d.elaborador_position_id, 'version', v.id,
    d.code, d.title, v.version_no, null, now() + interval '5 days');
  perform public.log_event(d.organization_id, v_action, 'Documento', d.id, d.code || ' v' || v.version_no,
    jsonb_build_object('estado', jsonb_build_object('before', v.status, 'after', 'borrador'), 'motivo', trim(p_reason)));
end $$;

/**
 * Firma de revisión o aprobación. Solo la invoca el servidor (service_role) DESPUÉS
 * de reautenticar al firmante con su contraseña; por eso recibe el firmante explícito.
 */
create or replace function public.sign_version(
  p_version uuid, p_signer uuid, p_action text, p_meaning text, p_ip inet, p_user_agent text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.document_versions; d public.documents; v_pos uuid; v_sig uuid; v_hash text; v_now timestamptz := now();
begin
  v := public.version_or_fail(p_version);
  select * into d from public.documents where id = v.document_id;
  select m.position_id into v_pos from public.memberships m
  where m.organization_id = d.organization_id and m.user_id = p_signer and m.status = 'activo'
    and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until);

  if v.pdf_sha256 is null then
    raise exception 'La versión no tiene PDF' using errcode = '22023';
  end if;
  if p_action = 'revision' then
    if v.status <> 'en_revision' or v_pos is distinct from d.revisor_position_id then
      raise exception 'No te corresponde firmar la revisión de esta versión' using errcode = '42501';
    end if;
  elsif p_action = 'aprobacion' then
    if v.status <> 'en_aprobacion' or v_pos is distinct from d.aprobador_position_id then
      raise exception 'No te corresponde firmar la aprobación de esta versión' using errcode = '42501';
    end if;
  else
    raise exception 'Acción de firma inválida' using errcode = '22023';
  end if;

  v_hash := encode(extensions.digest(
    concat_ws('|', v.id, p_action, p_signer, v.pdf_sha256, v_now, host(p_ip)), 'sha256'), 'hex');
  insert into public.signatures (organization_id, version_id, signer_id, action, meaning, file_sha256,
    reauth_at, ip, user_agent, signature_hash, signed_at)
  values (d.organization_id, v.id, p_signer, p_action, p_meaning, v.pdf_sha256,
    v_now, p_ip, left(p_user_agent, 400), v_hash, v_now)
  returning id into v_sig;

  if p_action = 'revision' then
    update public.document_versions set status = 'en_aprobacion', reviewed_by = p_signer where id = v.id;
    update public.documents set status = 'en_aprobacion' where id = d.id;
    perform public.complete_tasks('revisar', v.id, null, p_signer);
    perform public.create_task(d.organization_id, 'aprobar', d.aprobador_position_id, 'version', v.id,
      d.code, d.title, v.version_no, null, v_now + interval '5 days', p_signer);
    perform public.log_event(d.organization_id, 'firmar_revision', 'Documento', d.id, d.code || ' v' || v.version_no,
      jsonb_build_object('estado', jsonb_build_object('before', 'en_revision', 'after', 'en_aprobacion')), p_signer);
  else
    update public.document_versions set status = 'reemplazada'
    where document_id = d.id and status = 'aprobada';
    update public.document_versions
    set status = 'aprobada', approved_by = p_signer, approved_at = v_now, effective_date = current_date
    where id = v.id;
    update public.documents set status = 'vigente', current_version_id = v.id,
      next_review_date = current_date + make_interval(months => d.review_every_months)
    where id = d.id;
    update public.change_requests set new_version_id = v.id
    where document_id = d.id and status = 'aceptada' and new_version_id is null;
    perform public.complete_tasks('aprobar', v.id, null, p_signer);
    perform public.complete_tasks('revisar_documento_vencido', d.id, null, p_signer);
    if d.read_required then
      perform public.create_task(d.organization_id, 'confirmar_lectura', dd.position_id, 'version', v.id,
        d.code, d.title, v.version_no, null, v_now + interval '10 days', p_signer)
      from public.document_distribution dd where dd.document_id = d.id;
    end if;
    perform public.log_event(d.organization_id, 'firmar_aprobacion', 'Documento', d.id, d.code || ' v' || v.version_no,
      jsonb_build_object('estado', jsonb_build_object('before', 'en_aprobacion', 'after', 'vigente')), p_signer);
  end if;
  return v_sig;
end $$;

create or replace function public.confirm_read(p_version uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents; v_pos uuid; v_pending int;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  v_pos := public.my_position(d.organization_id);
  if v.status <> 'aprobada' or d.current_version_id <> v.id then
    raise exception 'Solo se confirma la lectura de la versión vigente' using errcode = '22023';
  end if;
  if not exists (select 1 from public.document_distribution where document_id = d.id and position_id = v_pos) then
    raise exception 'Tu cargo no está en la distribución de este documento' using errcode = '42501';
  end if;
  insert into public.read_acknowledgements (organization_id, version_id, user_id)
  values (d.organization_id, v.id, auth.uid())
  on conflict (version_id, user_id) do nothing;

  -- La tarea del cargo se cierra cuando todos sus ocupantes vigentes confirmaron.
  select count(*) into v_pending from public.memberships m
  where m.organization_id = d.organization_id and m.position_id = v_pos and m.status = 'activo'
    and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until)
    and not exists (select 1 from public.read_acknowledgements r where r.version_id = v.id and r.user_id = m.user_id);
  if v_pending = 0 then
    perform public.complete_tasks('confirmar_lectura', v.id, v_pos);
  end if;
  perform public.log_event(d.organization_id, 'confirmar_lectura', 'Documento', d.id, d.code || ' v' || v.version_no);
end $$;

create or replace function public.request_update(p_doc uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare d public.documents; v_id uuid;
begin
  d := public.doc_or_fail(p_doc);
  if d.status <> 'vigente' or not public.can_see_document(d.id) then
    raise exception 'Solo se solicita actualizar un documento vigente' using errcode = '22023';
  end if;
  insert into public.change_requests (organization_id, document_id, requested_by, reason)
  values (d.organization_id, d.id, auth.uid(), trim(p_reason))
  returning id into v_id;
  perform public.create_task(d.organization_id, 'atender_solicitud', d.elaborador_position_id, 'solicitud', v_id,
    d.code, d.title, null, left(trim(p_reason), 200), now() + interval '15 days');
  perform public.log_event(d.organization_id, 'solicitar_actualizacion', 'Documento', d.id, d.code,
    jsonb_build_object('motivo', trim(p_reason)));
  return v_id;
end $$;

/** Aceptar crea la versión N+1 en borrador; rechazar exige explicación. */
create or replace function public.resolve_change_request(p_request uuid, p_accept boolean, p_resolution text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare cr public.change_requests; d public.documents; v_new uuid; v_next int;
begin
  select * into cr from public.change_requests where id = p_request;
  if cr.id is null or cr.status <> 'abierta' then
    raise exception 'La solicitud no existe o ya fue atendida' using errcode = '22023';
  end if;
  d := public.doc_or_fail(cr.document_id);
  if not (
    public.my_position(d.organization_id) = d.elaborador_position_id
    or public.has_role(d.organization_id, 'lider_sig')
    or public.has_role(d.organization_id, 'lider_proceso', d.process_id)
  ) then
    raise exception 'No puedes atender esta solicitud' using errcode = '42501';
  end if;
  if not p_accept and length(trim(coalesce(p_resolution, ''))) < 10 then
    raise exception 'Explica por qué se rechaza en al menos 10 caracteres' using errcode = '22023';
  end if;

  if p_accept then
    if exists (select 1 from public.document_versions where document_id = d.id
               and status in ('borrador', 'en_revision', 'en_aprobacion')) then
      raise exception 'Ya hay una versión en curso de este documento' using errcode = '22023';
    end if;
    select coalesce(max(version_no), 0) + 1 into v_next from public.document_versions where document_id = d.id;
    insert into public.document_versions (organization_id, document_id, version_no, change_summary, elaborated_by)
    values (d.organization_id, d.id, v_next, left(cr.reason, 1000), auth.uid())
    returning id into v_new;
  end if;
  update public.change_requests set
    status = case when p_accept then 'aceptada' else 'rechazada' end,
    resolved_by = auth.uid(), resolved_at = now(), resolution = nullif(trim(coalesce(p_resolution, '')), '')
  where id = cr.id;
  perform public.complete_tasks('atender_solicitud', cr.id);
  perform public.log_event(d.organization_id, case when p_accept then 'aceptar_solicitud' else 'rechazar_solicitud' end,
    'Documento', d.id, d.code, jsonb_build_object('solicitud', cr.id));
  return v_new;
end $$;

create or replace function public.add_comment(p_version uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents; v_pos uuid; v_id uuid;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  v_pos := public.my_position(d.organization_id);
  if not (
    (v.status = 'en_revision' and v_pos in (d.revisor_position_id, d.elaborador_position_id))
    or (v.status = 'borrador' and v_pos = d.elaborador_position_id)
  ) then
    raise exception 'No puedes comentar esta versión' using errcode = '42501';
  end if;
  insert into public.review_comments (organization_id, version_id, author_id, body)
  values (d.organization_id, v.id, auth.uid(), trim(p_body))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.resolve_comment(p_comment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.review_comments; v public.document_versions; d public.documents;
begin
  select * into c from public.review_comments where id = p_comment;
  if c.id is null then raise exception 'Comentario no encontrado' using errcode = 'P0002'; end if;
  v := public.version_or_fail(c.version_id);
  d := public.doc_or_fail(v.document_id);
  if public.my_position(d.organization_id) not in (d.revisor_position_id, d.elaborador_position_id) then
    raise exception 'No puedes resolver este comentario' using errcode = '42501';
  end if;
  update public.review_comments set resolved_at = now(), resolved_by = auth.uid()
  where id = c.id and resolved_at is null;
end $$;

revoke execute on function public.doc_or_fail, public.version_or_fail from public, anon, authenticated;
revoke execute on function public.create_document, public.set_version_files, public.submit_version,
  public.return_version, public.confirm_read, public.request_update, public.resolve_change_request,
  public.add_comment, public.resolve_comment, public.sign_version from public, anon;
grant execute on function public.create_document, public.set_version_files, public.submit_version,
  public.return_version, public.confirm_read, public.request_update, public.resolve_change_request,
  public.add_comment, public.resolve_comment to authenticated;
-- sign_version: solo service_role (tras reautenticación en servidor).
revoke execute on function public.sign_version from authenticated;
grant execute on function public.sign_version to service_role;
