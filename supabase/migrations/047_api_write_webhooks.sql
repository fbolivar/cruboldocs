-- 047 — API de escritura + Webhooks (v1.4-1). Arquitectura: docs/api-write/ARQUITECTURA.md,
-- ADR-081..084. Scopes de escritura; idempotencia; funciones api_* (sin sesión, atribuidas al
-- creador de la key); endpoints/entregas de webhook; disparadores AFTER INSERT que encolan.

-- 047a · Scopes de escritura en create_api_key + idempotencia
create or replace function public.create_api_key(p_org uuid, p_name text, p_scopes text[], p_prefix text, p_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; s text;
begin
  if not public.can_manage_org(p_org) then
    raise exception 'No puedes administrar las claves de API' using errcode = '42501';
  end if;
  if p_scopes is null or array_length(p_scopes, 1) is null then
    raise exception 'Elige al menos un permiso' using errcode = '22023';
  end if;
  foreach s in array p_scopes loop
    if s <> all (array[
      'read:nonconformities','read:indicators','read:risks','read:audits','read:pqrs',
      'write:nonconformities','write:indicators','write:pqrs','write:nonconforming_outputs']) then
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

create table public.api_idempotency (
  organization_id uuid not null references public.organizations on delete cascade,
  idem_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, idem_key)
);
alter table public.api_idempotency enable row level security; -- deny-all (solo cliente de servicio)

-- 047b · Endpoints y entregas de webhook
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  url text not null check (url ~ '^https://'),
  secret text not null,
  events text[] not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (id, organization_id)
);
create index on public.webhook_endpoints (organization_id);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  endpoint_id uuid not null,
  event text not null,
  payload jsonb not null,
  status text not null default 'pendiente' check (status in ('pendiente','enviado','fallido')),
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (endpoint_id, organization_id) references public.webhook_endpoints (id, organization_id) on delete cascade
);
create index on public.webhook_deliveries (status, next_attempt_at);
create index on public.webhook_deliveries (organization_id, endpoint_id);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
create policy webhook_endpoint_select on public.webhook_endpoints for select to authenticated using (public.can_manage_org(organization_id));
create policy webhook_delivery_select on public.webhook_deliveries for select to authenticated using (public.can_manage_org(organization_id));

create or replace function public.create_webhook_endpoint(p_org uuid, p_url text, p_events text[], p_secret text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; e text;
begin
  if not public.can_manage_org(p_org) then
    raise exception 'No puedes administrar los webhooks' using errcode = '42501';
  end if;
  if p_url !~ '^https://' then
    raise exception 'La URL debe empezar por https://' using errcode = '22023';
  end if;
  if p_events is null or array_length(p_events, 1) is null then
    raise exception 'Elige al menos un evento' using errcode = '22023';
  end if;
  foreach e in array p_events loop
    if e <> all (array['nonconformity.created','indicator.measurement.recorded','pqrs.created','nonconforming_output.created']) then
      raise exception 'Evento no válido: %', e using errcode = '22023';
    end if;
  end loop;
  insert into public.webhook_endpoints (organization_id, url, secret, events)
  values (p_org, trim(p_url), p_secret, p_events)
  returning webhook_endpoints.id into v_id;
  perform public.log_event(p_org, 'crear_webhook', 'Webhook', v_id, trim(p_url), jsonb_build_object('events', to_jsonb(p_events)));
  return v_id;
end $$;

create or replace function public.revoke_webhook_endpoint(p_endpoint uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.webhook_endpoints;
begin
  select * into w from public.webhook_endpoints where id = p_endpoint;
  if w.id is null or not public.is_active_member(w.organization_id) then
    raise exception 'Webhook no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_org(w.organization_id) then
    raise exception 'No puedes revocar este webhook' using errcode = '42501';
  end if;
  if w.revoked_at is not null then
    raise exception 'El webhook ya está revocado' using errcode = '22023';
  end if;
  update public.webhook_endpoints set revoked_at = now() where id = w.id;
  perform public.log_event(w.organization_id, 'revocar_webhook', 'Webhook', w.id, w.url, '{}');
end $$;

revoke execute on function public.create_webhook_endpoint, public.revoke_webhook_endpoint from public, anon;
grant execute on function public.create_webhook_endpoint, public.revoke_webhook_endpoint to authenticated;

-- 047c · Encolado por disparadores
create or replace function public.enqueue_webhook(p_org uuid, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.webhook_deliveries (organization_id, endpoint_id, event, payload)
  select e.organization_id, e.id, p_event, p_payload
  from public.webhook_endpoints e
  where e.organization_id = p_org and e.revoked_at is null and p_event = any(e.events);
end $$;

create or replace function public.tg_webhook_nonconformity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'nonconformity.created', jsonb_build_object(
    'code', new.code, 'status', new.status, 'severity', new.severity, 'source', new.source,
    'title', new.title, 'detectedAt', new.detected_at,
    'process', (select p.name from public.processes p where p.id = new.process_id)));
  return new;
end $$;

create or replace function public.tg_webhook_measurement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'indicator.measurement.recorded', jsonb_build_object(
    'indicatorCode', (select i.code from public.indicators i where i.id = new.indicator_id),
    'period', new.period, 'value', new.value, 'compliance', new.compliance));
  return new;
end $$;

create or replace function public.tg_webhook_pqrs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'pqrs.created', jsonb_build_object(
    'code', new.code, 'type', new.type, 'channel', new.channel, 'status', new.status));
  return new;
end $$;

create or replace function public.tg_webhook_nc_output() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'nonconforming_output.created', jsonb_build_object(
    'code', new.code, 'status', new.status));
  return new;
end $$;

create trigger webhook_nonconformity after insert on public.nonconformities for each row execute function public.tg_webhook_nonconformity();
create trigger webhook_measurement after insert on public.indicator_measurements for each row execute function public.tg_webhook_measurement();
create trigger webhook_pqrs after insert on public.pqrs_cases for each row execute function public.tg_webhook_pqrs();
create trigger webhook_nc_output after insert on public.nonconforming_outputs for each row execute function public.tg_webhook_nc_output();

-- 047d · Funciones de escritura de la API (sin sesión; atribuidas a p_actor = creador de la key)
create or replace function public.api_report_nonconformity(
  p_org uuid, p_actor uuid, p_source text, p_process uuid, p_title text, p_description text, p_severity text, p_detected date
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if p_source <> all (array['auditoria_interna','auditoria_externa','queja_pqrs','producto_servicio','riesgo_materializado','mejora','indicador','otro']) then
    raise exception 'source no válido' using errcode = '22023';
  end if;
  if p_severity <> all (array['menor','mayor','critica']) then
    raise exception 'severity no válido' using errcode = '22023';
  end if;
  if p_process is not null and not exists (select 1 from public.processes where processes.id = p_process and processes.organization_id = p_org) then
    raise exception 'process no pertenece a la organización' using errcode = '22023';
  end if;
  v_year := extract(year from coalesce(p_detected, current_date))::int;
  insert into public.nc_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.nc_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'NC-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.nonconformities (organization_id, code, source, process_id, title, description, severity, reported_by, detected_at, created_by)
  values (p_org, v_code, p_source, p_process, trim(p_title), trim(p_description), p_severity, p_actor, coalesce(p_detected, current_date), p_actor)
  returning nonconformities.id into v_id;
  perform public.log_event(p_org, 'reportar_nc_api', 'NoConformidad', v_id, v_code, '{}', p_actor);
  return query select v_id, v_code;
end $$;

create or replace function public.api_create_pqrs(
  p_org uuid, p_actor uuid, p_type text, p_channel text, p_customer_name text, p_customer_contact text,
  p_process uuid, p_description text, p_received date, p_due_days int
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if p_type <> all (array['peticion','queja','reclamo','sugerencia','felicitacion']) then
    raise exception 'type no válido' using errcode = '22023';
  end if;
  if p_channel <> all (array['correo','telefono','web','presencial','otro']) then
    raise exception 'channel no válido' using errcode = '22023';
  end if;
  if p_process is not null and not exists (select 1 from public.processes where processes.id = p_process and processes.organization_id = p_org) then
    raise exception 'process no pertenece a la organización' using errcode = '22023';
  end if;
  v_year := extract(year from coalesce(p_received, current_date))::int;
  insert into public.pqrs_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.pqrs_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'PQRS-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.pqrs_cases (organization_id, code, type, channel, customer_name, customer_contact, process_id, description, received_date, due_date, status, created_by)
  values (p_org, v_code, p_type, p_channel, nullif(trim(coalesce(p_customer_name,'')),''), nullif(trim(coalesce(p_customer_contact,'')),''),
    p_process, trim(p_description), coalesce(p_received, current_date), coalesce(p_received, current_date) + coalesce(p_due_days, 15), 'recibida', p_actor)
  returning pqrs_cases.id into v_id;
  perform public.log_event(p_org, 'crear_pqrs_api', 'PQRS', v_id, v_code, '{}', p_actor);
  return query select v_id, v_code;
end $$;

create or replace function public.api_create_nc_output(
  p_org uuid, p_actor uuid, p_description text, p_process uuid, p_detected date, p_identification text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if p_process is not null and not exists (select 1 from public.processes where processes.id = p_process and processes.organization_id = p_org) then
    raise exception 'process no pertenece a la organización' using errcode = '22023';
  end if;
  v_year := extract(year from coalesce(p_detected, current_date))::int;
  insert into public.snc_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.snc_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'SNC-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.nonconforming_outputs (organization_id, code, description, process_id, detected_date, identification, created_by)
  values (p_org, v_code, trim(p_description), p_process, coalesce(p_detected, current_date), nullif(trim(coalesce(p_identification,'')),''), p_actor)
  returning nonconforming_outputs.id into v_id;
  perform public.log_event(p_org, 'crear_salida_api', 'SalidaNoConforme', v_id, v_code, '{}', p_actor);
  return query select v_id, v_code;
end $$;

create or replace function public.api_record_measurement(
  p_org uuid, p_actor uuid, p_indicator uuid, p_period date, p_value numeric, p_numerator numeric, p_denominator numeric, p_note text
) returns text language plpgsql security definer set search_path = '' as $$
declare i public.indicators; v_period date; v_value numeric; v_compliance text;
begin
  select * into i from public.indicators where id = p_indicator and organization_id = p_org;
  if i.id is null then raise exception 'indicator no encontrado' using errcode = 'P0002'; end if;
  if i.status <> 'activo' then raise exception 'El indicador está archivado' using errcode = '22023'; end if;
  v_period := date_trunc('month', coalesce(p_period, current_date))::date;
  if i.is_rate then
    if p_numerator is null or p_denominator is null then raise exception 'Captura numerador y denominador' using errcode = '22023'; end if;
    if p_denominator = 0 then raise exception 'El denominador no puede ser cero' using errcode = '22012'; end if;
    v_value := p_numerator / p_denominator * (case when i.unit = '%' then 100 else 1 end);
  else
    if p_value is null then raise exception 'Captura el valor' using errcode = '22023'; end if;
    v_value := p_value;
  end if;
  v_compliance := public.indicator_compliance(i.direction, i.target, i.target_max, i.tolerance_pct, v_value);
  insert into public.indicator_measurements (organization_id, indicator_id, period, value, numerator, denominator, compliance, note, captured_by)
  values (i.organization_id, i.id, v_period, v_value,
    case when i.is_rate then p_numerator else null end, case when i.is_rate then p_denominator else null end,
    v_compliance, nullif(trim(coalesce(p_note,'')),''), p_actor)
  on conflict (indicator_id, period) do update set
    value = excluded.value, numerator = excluded.numerator, denominator = excluded.denominator,
    compliance = excluded.compliance, note = excluded.note, captured_by = excluded.captured_by, captured_at = now();
  perform public.log_event(i.organization_id, 'registrar_medicion_api', 'Indicador', i.id, i.code,
    jsonb_build_object('periodo', to_char(v_period, 'YYYY-MM'), 'cumplimiento', v_compliance), p_actor);
  return v_compliance;
end $$;

revoke execute on function public.api_report_nonconformity, public.api_create_pqrs, public.api_create_nc_output,
  public.api_record_measurement, public.enqueue_webhook from public, anon, authenticated;

-- 047e · Los trigger functions corren con privilegios del dueño; se revoca su EXECUTE (anon baseline).
revoke execute on function public.tg_webhook_nonconformity, public.tg_webhook_measurement,
  public.tg_webhook_pqrs, public.tg_webhook_nc_output from public, anon, authenticated;
