-- 039 — Recordatorio de calibración vencida (metrología). Extiende tasks (tipo 'calibrar_equipo',
-- entidad 'equipo') y run_daily_jobs para crear la tarea de equipos con calibración vencida.
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type = any (array[
  'revisar','aprobar','corregir','atender_solicitud','confirmar_lectura','ejecutar_control',
  'revisar_documento_vencido','recertificar_accesos','ejecutar_accion_nc','conducir_auditoria',
  'capturar_medicion','cerrar_brecha','reevaluar_proveedor','atender_pqrs','cumplir_compromiso',
  'evaluar_requisito','revisar_aspecto','cumplir_mejora_sst','calibrar_equipo']));

alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type = any (array[
  'documento','version','solicitud','control','organizacion','no_conformidad','auditoria','indicador',
  'competencia','proveedor','pqrs','acta','requisito_legal','aspecto_ambiental','sst','equipo']));

create or replace function public.run_daily_jobs()
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; v_commitments int := 0; v_legal int := 0; v_sst int := 0; v_metrology int := 0; n int;
begin
  with due as (
    select d.* from public.documents d
    join public.organizations o on o.id = d.organization_id and o.status = 'activa'
    where d.status = 'vigente' and d.next_review_date <= current_date
  )
  select count(*) into n from due;
  perform public.create_task(d.organization_id, 'revisar_documento_vencido', d.elaborador_position_id,
    'documento', d.id, d.code, d.title, null, null, (d.next_review_date + 15)::timestamptz, null)
  from public.documents d
  join public.organizations o on o.id = d.organization_id and o.status = 'activa'
  where d.status = 'vigente' and d.next_review_date <= current_date;
  v_reviews := n;

  select count(*) into n from public.controls c
  join public.risks r on r.id = c.risk_id and r.status = 'activo'
  where c.next_due_date <= current_date + 7;
  perform public.create_task(c.organization_id, 'ejecutar_control', c.responsible_position_id,
    'control', c.id, r.code, c.description, null, null, c.next_due_date::timestamptz, null)
  from public.controls c
  join public.risks r on r.id = c.risk_id and r.status = 'activo'
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.next_due_date <= current_date + 7;
  v_controls := n;

  select count(*) into n from public.organizations o
  where o.status = 'activa' and coalesce(
    (select max(a.at) from public.access_recertifications a where a.organization_id = o.id), o.created_at
  ) < now() - make_interval(days => o.recert_period_days);
  perform public.create_task(o.id, 'recertificar_accesos', m.position_id, 'organizacion', o.id, null,
    'Recertificación de accesos', null, null, now() + interval '15 days', null)
  from public.organizations o
  join public.memberships m on m.organization_id = o.id and m.is_org_admin and m.status = 'activo' and m.position_id is not null
  where o.status = 'activa' and coalesce(
    (select max(a.at) from public.access_recertifications a where a.organization_id = o.id), o.created_at
  ) < now() - make_interval(days => o.recert_period_days);
  v_recerts := n;

  select count(*) into n from public.suppliers s
  join public.processes p on p.id = s.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = s.organization_id and o.status = 'activa'
  where s.is_active and s.next_eval_date is not null and s.next_eval_date <= current_date;
  perform public.create_task(s.organization_id, 'reevaluar_proveedor', p.leader_position_id,
    'proveedor', s.id, s.code, s.name, null, null, (s.next_eval_date + 15)::timestamptz, null)
  from public.suppliers s
  join public.processes p on p.id = s.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = s.organization_id and o.status = 'activa'
  where s.is_active and s.next_eval_date is not null and s.next_eval_date <= current_date;
  v_suppliers := n;

  select count(*) into n from public.pqrs_cases q
  join public.organizations o on o.id = q.organization_id and o.status = 'activa'
  left join public.processes p on p.id = q.process_id
  where q.status in ('recibida','en_gestion','resuelta') and q.due_date <= current_date
    and coalesce(q.responsible_position_id, p.leader_position_id) is not null;
  perform public.create_task(q.organization_id, 'atender_pqrs', coalesce(q.responsible_position_id, p.leader_position_id),
    'pqrs', q.id, q.code, left(q.description, 120), null, null, (q.due_date + 5)::timestamptz, null)
  from public.pqrs_cases q
  join public.organizations o on o.id = q.organization_id and o.status = 'activa'
  left join public.processes p on p.id = q.process_id
  where q.status in ('recibida','en_gestion','resuelta') and q.due_date <= current_date
    and coalesce(q.responsible_position_id, p.leader_position_id) is not null;
  v_pqrs := n;

  select count(*) into n from public.meeting_commitments c
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.status = 'pendiente' and c.responsible_position_id is not null
    and c.due_date is not null and c.due_date <= current_date;
  perform public.create_task(c.organization_id, 'cumplir_compromiso', c.responsible_position_id,
    'acta', c.id, m.code, left(c.description, 120), null, null, (c.due_date + 1)::timestamptz, null)
  from public.meeting_commitments c
  join public.meeting_minutes m on m.id = c.minute_id
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.status = 'pendiente' and c.responsible_position_id is not null
    and c.due_date is not null and c.due_date <= current_date;
  v_commitments := n;

  select count(*) into n from public.legal_requirements lr
  join public.processes p on p.id = lr.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = lr.organization_id and o.status = 'activa'
  where lr.status = 'vigente' and lr.next_eval_date is not null and lr.next_eval_date <= current_date;
  perform public.create_task(lr.organization_id, 'evaluar_requisito', p.leader_position_id,
    'requisito_legal', lr.id, lr.code, left(lr.title, 120), null, null, (lr.next_eval_date + 15)::timestamptz, null)
  from public.legal_requirements lr
  join public.processes p on p.id = lr.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = lr.organization_id and o.status = 'activa'
  where lr.status = 'vigente' and lr.next_eval_date is not null and lr.next_eval_date <= current_date;
  v_legal := n;

  select count(*) into n from public.sst_actions a
  join public.sst_evaluations e on e.id = a.evaluation_id
  join public.organizations o on o.id = a.organization_id and o.status = 'activa'
  where a.status in ('pendiente','en_curso') and a.responsible_position_id is not null
    and a.due_date is not null and a.due_date <= current_date;
  perform public.create_task(a.organization_id, 'cumplir_mejora_sst', a.responsible_position_id,
    'sst', a.id, e.code, left(a.description, 120), null, null, (a.due_date + 1)::timestamptz, null)
  from public.sst_actions a
  join public.sst_evaluations e on e.id = a.evaluation_id
  join public.organizations o on o.id = a.organization_id and o.status = 'activa'
  where a.status in ('pendiente','en_curso') and a.responsible_position_id is not null
    and a.due_date is not null and a.due_date <= current_date;
  v_sst := n;

  select count(*) into n from public.measurement_equipment eq
  join public.organizations o on o.id = eq.organization_id and o.status = 'activa'
  left join public.processes p on p.id = eq.process_id
  where eq.status = 'vigente' and eq.next_due_date is not null and eq.next_due_date <= current_date
    and coalesce(eq.responsible_position_id, p.leader_position_id) is not null;
  perform public.create_task(eq.organization_id, 'calibrar_equipo', coalesce(eq.responsible_position_id, p.leader_position_id),
    'equipo', eq.id, eq.code, eq.name, null, null, (eq.next_due_date + 15)::timestamptz, null)
  from public.measurement_equipment eq
  join public.organizations o on o.id = eq.organization_id and o.status = 'activa'
  left join public.processes p on p.id = eq.process_id
  where eq.status = 'vigente' and eq.next_due_date is not null and eq.next_due_date <= current_date
    and coalesce(eq.responsible_position_id, p.leader_position_id) is not null;
  v_metrology := n;

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal, 'sst', v_sst, 'metrologia', v_metrology), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal, 'sst', v_sst, 'metrologia', v_metrology);
end $function$;
