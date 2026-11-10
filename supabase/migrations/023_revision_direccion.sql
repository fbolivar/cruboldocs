-- 023 — Módulo Revisión por la dirección (ISO 9001 9.3). Arquitectura: docs/revision-direccion/ARQUITECTURA.md.
-- Consolida NC/auditorías/indicadores/riesgos/documentos en un snapshot jsonb calculado en el servidor
-- y congelado al cerrar. Escritura por RPC SECURITY DEFINER (espejo de los módulos previos). Cierre
-- firmado con el patrón ADR-004 (reautenticación + hash + IP) en campos propios del acta. Numeración RD-AAAA-###.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.management_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null,
  period_start date not null,
  period_end date not null,
  meeting_date date not null,
  attendees text,
  scope text,
  snapshot jsonb not null default '{}',
  inputs jsonb not null default '{}',
  status text not null default 'borrador' check (status in ('borrador','cerrada','cancelada')),
  approved_by uuid references public.profiles,
  approved_at timestamptz,
  reauth_at timestamptz,
  approval_hash text,
  ip inet,
  user_agent text,
  cancel_reason text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.review_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  review_id uuid not null,
  kind text not null check (kind in ('decision','accion_mejora','recurso','cambio_sgc')),
  description text not null,
  responsible_position_id uuid,
  due_date date,
  nonconformity_id uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (review_id, organization_id) references public.management_reviews (id, organization_id) on delete cascade,
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id)
);

create table public.management_review_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.management_reviews (organization_id, status);
create index on public.review_outputs (review_id, organization_id);
create index on public.review_outputs (responsible_position_id, organization_id);
create index on public.review_outputs (nonconformity_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_reviews(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_reviews(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig')
$$;

revoke execute on function public.can_see_reviews, public.can_manage_reviews from public, anon;
grant execute on function public.can_see_reviews, public.can_manage_reviews to authenticated;

alter table public.management_reviews enable row level security;
alter table public.review_outputs enable row level security;
alter table public.management_review_counters enable row level security; -- deny-all

create policy review_select on public.management_reviews for select to authenticated
  using (public.can_see_reviews(organization_id));
create policy review_output_select on public.review_outputs for select to authenticated
  using (public.can_see_reviews(organization_id));

-- ---------------------------------------------------------------------------
-- Snapshot de entradas (9.3.2): foto calculada leyendo los módulos
-- ---------------------------------------------------------------------------

create or replace function public.compute_review_snapshot(p_org uuid, p_start date, p_end date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_nc jsonb; v_aud jsonb; v_ind jsonb; v_risk jsonb; v_doc jsonb; v_prev jsonb;
  v_prev_id uuid;
begin
  -- No conformidades
  select jsonb_build_object(
    'abiertas', count(*) filter (where status not in ('cerrada','anulada')),
    'cerradas', count(*) filter (where status = 'cerrada' and closed_at is not null and closed_at::date between p_start and p_end),
    'eficaces', count(*) filter (where status = 'cerrada' and effective is true and closed_at is not null and closed_at::date between p_start and p_end)
  ) into v_nc from public.nonconformities where organization_id = p_org;

  -- Auditorías (cerradas en el periodo por su fecha planificada) y sus hallazgos de no conformidad
  select jsonb_build_object(
    'realizadas', (select count(*) from public.audits a
       where a.organization_id = p_org and a.status = 'cerrada' and a.planned_date between p_start and p_end),
    'hallazgosNc', (select count(*) from public.audit_findings f
       join public.audits a on a.id = f.audit_id
       where f.organization_id = p_org and f.type = 'no_conformidad'
         and a.status = 'cerrada' and a.planned_date between p_start and p_end)
  ) into v_aud;

  -- Indicadores activos: última medición de cada uno con period <= p_end
  with ult as (
    select distinct on (m.indicator_id) m.indicator_id, m.compliance
    from public.indicator_measurements m
    join public.indicators i on i.id = m.indicator_id
    where m.organization_id = p_org and i.status = 'activo' and m.period <= p_end
    order by m.indicator_id, m.period desc
  )
  select jsonb_build_object(
    'cumplenPct', case when count(*) = 0 then null
      else round(count(*) filter (where compliance = 'cumple') * 100.0 / count(*)) end,
    'enRiesgo', count(*) filter (where compliance = 'en_riesgo'),
    'noCumplen', count(*) filter (where compliance = 'no_cumple')
  ) into v_ind from ult;

  -- Riesgos activos con última valoración residual alta/extrema; controles a tiempo
  with residual as (
    select distinct on (ra.risk_id) ra.risk_id, ra.level
    from public.risk_assessments ra
    join public.risks r on r.id = ra.risk_id
    where ra.organization_id = p_org and ra.kind = 'residual' and r.status = 'activo'
    order by ra.risk_id, ra.assessed_at desc
  ),
  ctrl as (
    select count(*) total, count(*) filter (where next_due_date >= current_date) a_tiempo
    from public.controls where organization_id = p_org
  )
  select jsonb_build_object(
    'altos', (select count(*) from residual where level in ('alto','extremo')),
    'controlesATiempoPct', (select case when total = 0 then null else round(a_tiempo * 100.0 / total) end from ctrl)
  ) into v_risk;

  -- Documentos vigentes y por vencer (próximos 60 días o ya vencidos)
  select jsonb_build_object(
    'vigentes', count(*) filter (where status = 'vigente'),
    'porVencer', count(*) filter (where status = 'vigente' and next_review_date is not null and next_review_date <= current_date + 60)
  ) into v_doc from public.documents where organization_id = p_org;

  -- Acciones de la última acta cerrada anterior (compromisos y cuántos siguen sin cerrar)
  select id into v_prev_id from public.management_reviews
   where organization_id = p_org and status = 'cerrada'
   order by meeting_date desc limit 1;
  if v_prev_id is null then
    v_prev := jsonb_build_object('total', 0, 'pendientes', 0);
  else
    select jsonb_build_object(
      'total', count(*),
      'pendientes', count(*) filter (where kind = 'accion_mejora'
        and (nonconformity_id is null
          or exists (select 1 from public.nonconformities n
                     where n.id = o.nonconformity_id and n.status not in ('cerrada','anulada'))))
    ) into v_prev from public.review_outputs o where review_id = v_prev_id;
  end if;

  return jsonb_build_object(
    'nc', v_nc, 'auditorias', v_aud, 'indicadores', v_ind,
    'riesgos', v_risk, 'documentos', v_doc, 'accionesPrevias', v_prev);
end $$;

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.review_or_fail(p_review uuid) returns public.management_reviews
language plpgsql stable security definer set search_path = '' as $$
declare r public.management_reviews;
begin
  select * into r from public.management_reviews where id = p_review;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Acta no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return r;
end $$;

create or replace function public.create_review(
  p_org uuid, p_title text, p_start date, p_end date, p_meeting date, p_scope text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_reviews(p_org) then
    raise exception 'Solo el Líder SIG crea actas de revisión' using errcode = '42501';
  end if;
  if p_end < p_start then
    raise exception 'El fin del periodo no puede ser anterior al inicio' using errcode = '22023';
  end if;
  v_year := extract(year from coalesce(p_meeting, current_date))::int;
  insert into public.management_review_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.management_review_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'RD-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.management_reviews (organization_id, code, title, period_start, period_end, meeting_date,
    scope, snapshot, inputs, created_by)
  values (p_org, v_code, trim(p_title), p_start, p_end, coalesce(p_meeting, current_date),
    nullif(trim(coalesce(p_scope, '')), ''), public.compute_review_snapshot(p_org, p_start, p_end), '{}', auth.uid())
  returning management_reviews.id into v_id;

  perform public.log_event(p_org, 'crear_revision', 'RevisionDireccion', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.refresh_review_snapshot(p_review uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews;
begin
  r := public.review_or_fail(p_review);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG edita actas' using errcode = '42501';
  end if;
  if r.status <> 'borrador' then
    raise exception 'El acta ya no es editable' using errcode = '22023';
  end if;
  update public.management_reviews
    set snapshot = public.compute_review_snapshot(r.organization_id, r.period_start, r.period_end), updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'actualizar_snapshot_revision', 'RevisionDireccion', r.id, r.code, '{}');
end $$;

create or replace function public.update_review(
  p_review uuid, p_attendees text, p_scope text, p_inputs jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews;
begin
  r := public.review_or_fail(p_review);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG edita actas' using errcode = '42501';
  end if;
  if r.status <> 'borrador' then
    raise exception 'El acta ya no es editable' using errcode = '22023';
  end if;
  update public.management_reviews set
    attendees = nullif(trim(coalesce(p_attendees, '')), ''),
    scope = nullif(trim(coalesce(p_scope, '')), ''),
    inputs = coalesce(p_inputs, '{}'::jsonb),
    updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'editar_revision', 'RevisionDireccion', r.id, r.code, '{}');
end $$;

create or replace function public.add_review_output(
  p_review uuid, p_kind text, p_description text, p_responsible uuid, p_due date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews; v_id uuid;
begin
  r := public.review_or_fail(p_review);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG registra decisiones' using errcode = '42501';
  end if;
  if r.status <> 'borrador' then
    raise exception 'El acta ya no es editable' using errcode = '22023';
  end if;
  insert into public.review_outputs (organization_id, review_id, kind, description, responsible_position_id, due_date, created_by)
  values (r.organization_id, r.id, p_kind, trim(p_description), p_responsible, p_due, auth.uid())
  returning id into v_id;
  perform public.log_event(r.organization_id, 'agregar_decision', 'RevisionDireccion', r.id, r.code, jsonb_build_object('tipo', p_kind));
  return v_id;
end $$;

create or replace function public.generate_nc_from_output(p_output uuid) returns table (code text)
language plpgsql security definer set search_path = '' as $$
declare o public.review_outputs; r public.management_reviews; v_nc_id uuid; v_nc_code text;
begin
  select * into o from public.review_outputs where id = p_output for update;
  if o.id is null then raise exception 'Decisión no encontrada' using errcode = 'P0002'; end if;
  r := public.review_or_fail(o.review_id);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG genera la no conformidad' using errcode = '42501';
  end if;
  if o.kind <> 'accion_mejora' then
    raise exception 'Solo una acción de mejora genera no conformidad' using errcode = '22023';
  end if;
  if o.nonconformity_id is not null then
    raise exception 'Esta decisión ya tiene una no conformidad' using errcode = '22023';
  end if;
  select n.id, n.code into v_nc_id, v_nc_code
  from public.report_nonconformity(r.organization_id, 'mejora', null,
    left(o.description, 110), o.description, 'menor') n;
  update public.review_outputs set nonconformity_id = v_nc_id where id = o.id;
  perform public.log_event(r.organization_id, 'generar_nc_decision', 'RevisionDireccion', r.id, r.code, jsonb_build_object('nc', v_nc_code));
  return query select v_nc_code;
end $$;

/** Cierra y firma el acta (ADR-004: reautenticación reciente + hash + IP). Congela el snapshot. */
create or replace function public.close_review(
  p_review uuid, p_reauth_at timestamptz, p_hash text, p_ip inet, p_ua text
) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews;
begin
  r := public.review_or_fail(p_review);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG cierra y firma el acta' using errcode = '42501';
  end if;
  if r.status <> 'borrador' then
    raise exception 'El acta ya no es editable' using errcode = '22023';
  end if;
  if p_reauth_at is null or p_reauth_at < now() - interval '10 minutes' then
    raise exception 'Vuelve a confirmar tu identidad para firmar' using errcode = '42501';
  end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Firma inválida' using errcode = '22023';
  end if;
  update public.management_reviews set
    status = 'cerrada', approved_by = auth.uid(), approved_at = now(),
    reauth_at = p_reauth_at, approval_hash = p_hash, ip = p_ip, user_agent = p_ua, updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'cerrar_revision', 'RevisionDireccion', r.id, r.code, '{}');
end $$;

create or replace function public.cancel_review(p_review uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews;
begin
  r := public.review_or_fail(p_review);
  if not public.can_manage_reviews(r.organization_id) then
    raise exception 'Solo el Líder SIG cancela actas' using errcode = '42501';
  end if;
  if r.status <> 'borrador' then
    raise exception 'El acta ya no es editable' using errcode = '22023';
  end if;
  update public.management_reviews set status = 'cancelada', cancel_reason = trim(p_reason), updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'cancelar_revision', 'RevisionDireccion', r.id, r.code, jsonb_build_object('motivo', trim(p_reason)));
end $$;

revoke execute on function public.review_or_fail, public.compute_review_snapshot from public, anon, authenticated;
revoke execute on function public.create_review, public.refresh_review_snapshot, public.update_review,
  public.add_review_output, public.generate_nc_from_output, public.close_review, public.cancel_review from public, anon;
grant execute on function public.create_review, public.refresh_review_snapshot, public.update_review,
  public.add_review_output, public.generate_nc_from_output, public.close_review, public.cancel_review to authenticated;
