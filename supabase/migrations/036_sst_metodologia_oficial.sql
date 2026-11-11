-- 036 — SG-SST: corrección a la metodología OFICIAL de la Res. 0312 (art. 3/9/27). Se descubrió
-- que la norma NO usa tablas de pesos re-escaladas por nivel: usa UNA sola tabla de valores
-- (weight_60) y los estándares que NO aplican a micro/pequeña empresa se autocalifican al MÁXIMO en
-- la columna "No Aplica" (el total sigue sobre 100). Por eso se reemplazan los pesos provisionales
-- 7/21 por APLICABILIDAD por nivel (listas oficiales de los art. 3 y 9), y el scoring usa weight_60.

alter table public.sst_standards add column applies_7 boolean not null default false;
alter table public.sst_standards add column applies_21 boolean not null default false;

-- Art. 3 — 7 estándares (microempresa ≤10, riesgo I–III)
update public.sst_standards set applies_7 = true
  where code in ('1.1.1','1.1.4','1.2.2','2.4.1','3.1.4','4.1.1','4.2.1');

-- Art. 9 — 21 estándares (pequeña empresa 11–50, riesgo I–III)
update public.sst_standards set applies_21 = true
  where code in ('1.1.1','1.1.3','1.1.4','1.1.6','1.1.8','1.2.1','2.1.1','2.4.1','2.5.1',
    '3.1.1','3.1.2','3.1.4','3.1.6','3.2.1','3.2.2','4.1.1','4.2.5','4.2.6','5.1.1','5.1.2','6.1.3');

-- Los pesos 7/21 provisionales quedan sin uso (el peso oficial es weight_60).
update public.sst_standards set weight_7 = null, weight_21 = null;

-- Recálculo oficial: peso único weight_60; cuenta cumple y "no aplica" (justificado o autocrédito).
create or replace function public.sst_recompute(p_eval uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_obtained numeric;
begin
  select coalesce(sum(s.weight_60), 0) into v_obtained
    from public.sst_evaluation_items i
    join public.sst_standards s on s.id = i.standard_id
    where i.evaluation_id = p_eval
      and (i.status = 'cumple' or (i.status = 'no_aplica' and nullif(trim(coalesce(i.justification, '')), '') is not null));
  update public.sst_evaluations set
    score = round(v_obtained, 2),
    rating = case when v_obtained < 60 then 'critico' when v_obtained <= 85 then 'moderado' else 'aceptable' end,
    updated_at = now()
  where id = p_eval;
end $$;

-- Crea la autoevaluación: inserta los 60 estándares; los que NO aplican al nivel quedan
-- autocalificados como "No Aplica" al máximo; los aplicables, pendientes.
create or replace function public.create_evaluation(p_org uuid, p_period int, p_workers int, p_risk int)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_seq int; v_tier int;
begin
  if not public.can_manage_sst(p_org) then
    raise exception 'No puedes crear autoevaluaciones' using errcode = '42501';
  end if;
  if p_period < 2019 or p_workers < 1 or p_risk < 1 or p_risk > 5 then
    raise exception 'Datos de la autoevaluación no válidos' using errcode = '22023';
  end if;
  v_tier := public.sst_tier(p_workers, p_risk);
  insert into public.sst_counters (organization_id, year, last_seq)
    values (p_org, p_period, 1)
    on conflict (organization_id, year) do update set last_seq = public.sst_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'SGSST-' || p_period || '-' || lpad(v_seq::text, 3, '0');
  insert into public.sst_evaluations (organization_id, code, period, worker_count, risk_class, tier, status, created_by)
  values (p_org, v_code, p_period, p_workers, p_risk, v_tier, 'borrador', auth.uid())
  returning sst_evaluations.id into v_id;
  insert into public.sst_evaluation_items (organization_id, evaluation_id, standard_id, status, justification)
  select p_org, v_id, s.id,
    case when (v_tier = 60) or (v_tier = 7 and s.applies_7) or (v_tier = 21 and s.applies_21) then 'pendiente' else 'no_aplica' end,
    case when (v_tier = 60) or (v_tier = 7 and s.applies_7) or (v_tier = 21 and s.applies_21) then null else 'No aplica para este nivel (Res. 0312)' end
  from public.sst_standards s
  where s.is_active;
  perform public.sst_recompute(v_id);
  perform public.log_event(p_org, 'crear_autoevaluacion', 'SG-SST', v_id, v_code, jsonb_build_object('nivel', v_tier));
  return query select v_id, v_code;
end $$;

-- Solo se diligencian los estándares que APLICAN al nivel; los no aplicables no se tocan.
create or replace function public.set_item_status(p_item uuid, p_status text, p_justification text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.sst_evaluation_items; e public.sst_evaluations; v_applies boolean;
begin
  select * into i from public.sst_evaluation_items where id = p_item;
  if i.id is null or not public.is_active_member(i.organization_id) then
    raise exception 'Ítem no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  e := public.sst_evaluation_or_fail(i.evaluation_id);
  if not public.can_manage_sst(e.organization_id) then
    raise exception 'No puedes diligenciar esta autoevaluación' using errcode = '42501';
  end if;
  if e.status <> 'borrador' then
    raise exception 'La autoevaluación está cerrada' using errcode = '22023';
  end if;
  select case e.tier when 7 then s.applies_7 when 21 then s.applies_21 else true end
    into v_applies from public.sst_standards s where s.id = i.standard_id;
  if not v_applies then
    raise exception 'Este estándar no aplica a tu nivel (calificado automáticamente)' using errcode = '22023';
  end if;
  if p_status not in ('pendiente','cumple','no_cumple','no_aplica') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if p_status = 'no_aplica' and nullif(trim(coalesce(p_justification, '')), '') is null then
    raise exception 'Justifica por qué el estándar no aplica' using errcode = '23514';
  end if;
  update public.sst_evaluation_items set
    status = p_status,
    justification = case when p_status = 'no_aplica' then trim(p_justification) else null end,
    updated_at = now()
  where id = p_item;
  perform public.sst_recompute(e.id);
end $$;

revoke execute on function public.sst_recompute from public, anon, authenticated;
revoke execute on function public.create_evaluation, public.set_item_status from public, anon;
grant execute on function public.create_evaluation, public.set_item_status to authenticated;
