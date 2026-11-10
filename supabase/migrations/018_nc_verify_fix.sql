-- 018 — Hardening del módulo No Conformidades (AUD-20261110-NC, MED-01).
-- `verify_nc` autorizaba por `my_position IS NOT DISTINCT FROM owner_position_id`. Como
-- `NULL IS NOT DISTINCT FROM NULL` es TRUE, un miembro SIN cargo podría verificar una NC SIN dueño.
-- Se exige dueño no nulo y coincidencia estricta de cargo.

create or replace function public.verify_nc(p_nc uuid, p_effective boolean, p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  n := public.nc_or_fail(p_nc);
  if not (public.has_role(n.organization_id, 'lider_sig')
          or (n.owner_position_id is not null and public.my_position(n.organization_id) = n.owner_position_id)) then
    raise exception 'Solo el Líder SIG o el dueño verifica la eficacia' using errcode = '42501';
  end if;
  if n.status <> 'verificacion' then
    raise exception 'La no conformidad no está en verificación' using errcode = '22023';
  end if;
  if p_effective then
    update public.nonconformities set status = 'cerrada', effective = true, verified_by = auth.uid(),
      verified_at = now(), verification_notes = trim(coalesce(p_notes, '')), closed_at = now(), updated_at = now()
    where id = n.id;
  else
    update public.nonconformities set status = 'plan_accion', effective = false, reopened_count = reopened_count + 1,
      verified_by = auth.uid(), verified_at = now(), verification_notes = trim(coalesce(p_notes, '')), updated_at = now()
    where id = n.id;
  end if;
  perform public.log_event(n.organization_id, 'verificar_nc', 'NoConformidad', n.id, n.code,
    jsonb_build_object('eficaz', p_effective));
end $$;
