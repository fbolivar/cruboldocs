-- 014 — Correcciones de la re-verificación del bloque 6 (AUD-20260924, sección 7)
-- R-1: recertificar y revocar son una sola operación (antes una revocación rechazada dejaba la
--      membresía como recertificada).
-- N-2: la fecha y el revisor de una recertificación los fija la base.
-- N-4: un acceso revocado solo vuelve con una invitación nueva.
-- RA-04: la traza no copia la descripción de los controles de riesgo.

-- ---------------------------------------------------------------------------
-- R-1 y N-2 — recertificación
-- ---------------------------------------------------------------------------

create or replace function public.recertification_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.at := now();
  new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
  return new;
end $$;

revoke execute on function public.recertification_defaults from public, anon, authenticated;

create trigger t_defaults before insert on public.access_recertifications
  for each row execute function public.recertification_defaults();

/**
 * Aplica la decisión en la membresía dentro de la misma transacción: si la revocación no está
 * permitida (p. ej. un Líder SIG frente a un Admin), falla también el registro de la decisión.
 */
create or replace function public.stamp_recertification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.decision = 'revocar' then
    update public.memberships set status = 'revocado', last_recertified_at = new.at where id = new.membership_id;
  else
    update public.memberships set last_recertified_at = new.at where id = new.membership_id;
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- N-4 — sin reactivación por REST
-- ---------------------------------------------------------------------------

create or replace function public.guard_membership_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if old.user_id = (select auth.uid()) then
    raise exception 'No puedes modificar tu propio acceso. Pídeselo a otro administrador.' using errcode = '42501';
  end if;
  if old.status = 'revocado' and new.status = 'activo' then
    raise exception 'Un acceso revocado vuelve solo con una invitación nueva.' using errcode = '42501';
  end if;
  -- Recertificar (solo la fecha) no es modificar el acceso.
  if old.is_org_admin and not public.is_org_admin(old.organization_id)
    and (new.position_id, new.valid_until, new.status) is distinct from (old.position_id, old.valid_until, old.status) then
    raise exception 'Solo un administrador modifica el acceso de otro administrador.' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- RA-04 — la traza guarda el id del control, no su descripción
-- ---------------------------------------------------------------------------

create or replace function public.add_control(
  p_risk uuid, p_description text, p_type text, p_frequency text, p_responsible uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r public.risks; v_id uuid;
begin
  r := public.risk_or_fail(p_risk);
  if not public.can_manage_risk(r.organization_id, r.process_id) then
    raise exception 'Tu cargo no puede agregar controles a este riesgo' using errcode = '42501';
  end if;
  insert into public.controls (organization_id, risk_id, description, type, frequency, responsible_position_id, next_due_date)
  values (r.organization_id, r.id, trim(p_description), p_type, p_frequency, p_responsible,
    coalesce((current_date + public.frequency_interval(p_frequency))::date, current_date + 30))
  returning id into v_id;
  perform public.log_event(r.organization_id, 'agregar_control', 'Riesgo', r.id, r.code,
    jsonb_build_object('control', jsonb_build_object('before', null, 'after', v_id)));
  return v_id;
end $$;
