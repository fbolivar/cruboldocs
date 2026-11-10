-- 021 — Endurecimiento del Módulo Auditorías (auditoría AUD-20261110-auditorias).
-- BAJO-01: generate_nc_from_finding bloquea el hallazgo (for update) para que dos
-- llamadas concurrentes no generen dos NC para el mismo hallazgo (idempotencia real).

create or replace function public.generate_nc_from_finding(p_finding uuid) returns table (code text)
language plpgsql security definer set search_path = '' as $$
declare f public.audit_findings; a public.audits; v_nc_id uuid; v_nc_code text;
begin
  -- Bloquea la fila del hallazgo: una segunda llamada concurrente espera y, al
  -- continuar, ve nonconformity_id ya asignado y falla la guarda de idempotencia.
  select * into f from public.audit_findings where id = p_finding for update;
  if f.id is null then raise exception 'Hallazgo no encontrado' using errcode = 'P0002'; end if;
  a := public.audit_or_fail(f.audit_id);
  if not (public.has_role(a.organization_id, 'auditor') or public.can_manage_audits(a.organization_id)) then
    raise exception 'Tu cargo no puede generar la no conformidad' using errcode = '42501';
  end if;
  if f.type <> 'no_conformidad' then
    raise exception 'El hallazgo no es una no conformidad' using errcode = '22023';
  end if;
  if f.nonconformity_id is not null then
    raise exception 'Este hallazgo ya tiene una no conformidad' using errcode = '22023';
  end if;
  select r.id, r.code into v_nc_id, v_nc_code
  from public.report_nonconformity(a.organization_id, 'auditoria_interna', f.process_id,
    left(f.description, 120), f.description, coalesce(f.severity, 'menor')) r;
  update public.audit_findings set nonconformity_id = v_nc_id where id = f.id;
  perform public.log_event(a.organization_id, 'generar_nc_hallazgo', 'Auditoria', a.id, a.code, jsonb_build_object('nc', v_nc_code));
  return query select v_nc_code;
end $$;
