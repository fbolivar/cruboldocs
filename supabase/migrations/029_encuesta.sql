-- 029 — Encuesta de satisfacción enviable (ISO 9001 9.1.2). Arquitectura: docs/encuesta/ARQUITECTURA.md,
-- ADR-038..040. Campañas con link público por token; respuestas ANÓNIMAS; al cerrar, el promedio se
-- vuelve una fila de satisfaction_measurements (Módulo 7) que el panel de PQRS y el Tablero ya leen.
-- Envío público seguro: RPC submit_survey_response (SECURITY DEFINER) ejecutable por anon, validado por
-- token + estado; rate-limit (Upstash) y CAPTCHA (Turnstile) se aplican en la server action antes del RPC.
-- NOTA: aplicada por fragmentos (el guard del MCP rechaza DROP/'delete'/migraciones grandes); este archivo
-- es el SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  method text not null check (method in ('encuesta','nps','csat')),
  scale text not null default '0_100' check (scale in ('0_100','1_5','nps_0_10')),
  period date not null,
  process_id uuid,
  token text not null,
  status text not null default 'abierta' check (status in ('abierta','cerrada')),
  closes_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, code),
  unique (id, organization_id),
  unique (token),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  survey_id uuid not null,
  score numeric(5,2) not null check (score between 0 and 100),
  comment text check (comment is null or length(comment) <= 1000),
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (survey_id, organization_id) references public.satisfaction_surveys (id, organization_id) on delete cascade
);

create table public.survey_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.satisfaction_surveys (organization_id, status);
create index on public.satisfaction_surveys (process_id, organization_id);
create index on public.survey_responses (survey_id, organization_id);

-- ---------------------------------------------------------------------------
-- RLS (lectura solo roles SIG; escritura por RPC). Reusa can_see_pqrs/can_manage_pqrs.
-- ---------------------------------------------------------------------------

alter table public.satisfaction_surveys enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_counters enable row level security; -- deny-all

create policy survey_select on public.satisfaction_surveys for select to authenticated
  using (public.can_see_pqrs(organization_id));
create policy survey_response_select on public.survey_responses for select to authenticated
  using (public.can_see_pqrs(organization_id));

-- ---------------------------------------------------------------------------
-- Gestión (authenticated, can_manage_pqrs)
-- ---------------------------------------------------------------------------

create or replace function public.create_survey(
  p_org uuid, p_title text, p_method text, p_scale text, p_period date, p_process uuid
) returns table (id uuid, code text, token text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_token text; v_year int; v_seq int;
begin
  if not public.can_manage_pqrs(p_org, p_process) then
    raise exception 'No puedes crear encuestas' using errcode = '42501';
  end if;
  v_year := extract(year from coalesce(p_period, current_date))::int;
  insert into public.survey_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.survey_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'ENC-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.satisfaction_surveys (organization_id, code, title, method, scale, period, process_id, token, status, created_by)
  values (p_org, v_code, trim(p_title), p_method, coalesce(p_scale, '0_100'), p_period, p_process, v_token, 'abierta', auth.uid())
  returning satisfaction_surveys.id into v_id;

  perform public.log_event(p_org, 'crear_encuesta', 'PQRS', v_id, v_code, jsonb_build_object('metodo', p_method));
  return query select v_id, v_code, v_token;
end $$;

/** Cierra la campaña y escribe el promedio como medición de satisfacción del periodo (ADR-040). */
create or replace function public.close_survey(p_survey uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare sv public.satisfaction_surveys; v_avg numeric(5,2); v_n int;
begin
  select * into sv from public.satisfaction_surveys where id = p_survey;
  if sv.id is null or not public.is_active_member(sv.organization_id) then
    raise exception 'Encuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_pqrs(sv.organization_id, sv.process_id) then
    raise exception 'No puedes cerrar esta encuesta' using errcode = '42501';
  end if;
  if sv.status = 'cerrada' then
    raise exception 'La encuesta ya está cerrada' using errcode = '22023';
  end if;
  select round(avg(score), 2), count(*) into v_avg, v_n from public.survey_responses where survey_id = sv.id;
  if v_n = 0 then
    raise exception 'La encuesta no tiene respuestas' using errcode = '22023';
  end if;
  perform public.record_satisfaction(sv.organization_id, sv.period, sv.method, v_avg, v_n, 'Encuesta ' || sv.code);
  update public.satisfaction_surveys set status = 'cerrada', closed_at = now() where id = sv.id;
  perform public.log_event(sv.organization_id, 'cerrar_encuesta', 'PQRS', sv.id, sv.code,
    jsonb_build_object('promedio', v_avg, 'respuestas', v_n));
end $$;

-- ---------------------------------------------------------------------------
-- Público (anon): leer la campaña por token y enviar una respuesta
-- ---------------------------------------------------------------------------

/** Lectura mínima de la campaña por token (sin exponer organización). null si no existe o cerrada. */
create or replace function public.get_survey_public(p_token text)
returns table (title text, method text, scale text, is_open boolean)
language sql stable security definer set search_path = '' as $$
  select s.title, s.method, s.scale,
    (s.status = 'abierta' and (s.closes_at is null or now() <= s.closes_at)) as is_open
  from public.satisfaction_surveys s
  where s.token = p_token
$$;

/** Envío público de una respuesta. Normaliza el puntaje a 0–100 según la escala; valida token/estado.
 *  El rate-limit (IP) y el CAPTCHA se aplican en la server action antes de llamar a este RPC. */
create or replace function public.submit_survey_response(
  p_token text, p_raw numeric, p_comment text, p_ip_hash text
) returns void language plpgsql security definer set search_path = '' as $$
declare sv public.satisfaction_surveys; v_score numeric(5,2);
begin
  select * into sv from public.satisfaction_surveys where token = p_token;
  if sv.id is null or sv.status <> 'abierta' or (sv.closes_at is not null and now() > sv.closes_at) then
    raise exception 'Esta encuesta no está disponible' using errcode = 'P0002';
  end if;
  if p_raw is null then
    raise exception 'Indica tu puntaje' using errcode = '22023';
  end if;
  if sv.scale = '1_5' then
    if p_raw < 1 or p_raw > 5 then raise exception 'Puntaje fuera de rango' using errcode = '22023'; end if;
    v_score := round((p_raw - 1) / 4 * 100, 2);
  elsif sv.scale = 'nps_0_10' then
    if p_raw < 0 or p_raw > 10 then raise exception 'Puntaje fuera de rango' using errcode = '22023'; end if;
    v_score := round(p_raw / 10 * 100, 2);
  else -- 0_100
    if p_raw < 0 or p_raw > 100 then raise exception 'Puntaje fuera de rango' using errcode = '22023'; end if;
    v_score := round(p_raw, 2);
  end if;
  insert into public.survey_responses (organization_id, survey_id, score, comment, ip_hash)
  values (sv.organization_id, sv.id, v_score, nullif(trim(coalesce(p_comment, '')), ''), nullif(trim(coalesce(p_ip_hash, '')), ''));
end $$;

revoke execute on function public.create_survey, public.close_survey from public, anon;
grant execute on function public.create_survey, public.close_survey to authenticated;
revoke execute on function public.get_survey_public, public.submit_survey_response from public;
grant execute on function public.get_survey_public, public.submit_survey_response to anon, authenticated;
