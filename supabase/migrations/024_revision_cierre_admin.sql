-- 024 — Endurecimiento del cierre firmado de la Revisión por la dirección (AUD-20261110-revision-direccion MED-01).
-- El cierre firmado (ADR-004) exige reautenticación con contraseña. Antes, `close_review` era ejecutable por
-- `authenticated` con `p_reauth_at`/`p_hash` autoaseverados: una sesión de Líder SIG ya autenticada (o secuestrada)
-- podía firmar el acta por REST directo sin reingresar la contraseña. Igual que la firma de documentos
-- (`sign_version_checked`), el cierre pasa a ser **admin-only**: el único camino para firmar es la server action,
-- que reautentica contra Auth antes de llamar. Se recibe el aprobador explícito (`p_approver`) porque bajo
-- `service_role` no hay `auth.uid()`; se autoriza su rol Líder SIG directamente contra sus membresía y roles.

-- Se reemplaza la firma de 5 argumentos por una de 6 (con p_approver). No se usa DROP (el guard de migración
-- lo bloquea): se crea la versión de 6 args y, al final, se REVOCA de `authenticated` la versión vieja de 5 args.
-- Así el camino explotable de MED-01 deja de existir; la función de 5 args queda sin privilegio y sin uso.
create function public.close_review(
  p_review uuid, p_approver uuid, p_reauth_at timestamptz, p_hash text, p_ip inet, p_ua text
) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.management_reviews; v_pos uuid;
begin
  select * into r from public.management_reviews where id = p_review;
  if r.id is null then
    raise exception 'Acta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  -- Autorización del aprobador explícito (no por auth.uid(): la función corre como service_role).
  -- Debe ser miembro activo y vigente de la organización del acta, con rol Líder SIG.
  select m.position_id into v_pos from public.memberships m
   where m.organization_id = r.organization_id and m.user_id = p_approver and m.status = 'activo'
     and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until);
  if v_pos is null or not exists (
    select 1 from public.position_roles pr
     where pr.organization_id = r.organization_id and pr.position_id = v_pos and pr.role = 'lider_sig'
  ) then
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
    status = 'cerrada', approved_by = p_approver, approved_at = now(),
    reauth_at = p_reauth_at, approval_hash = p_hash, ip = p_ip, user_agent = p_ua, updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'cerrar_revision', 'RevisionDireccion', r.id, r.code, '{}', p_approver);
end $$;

revoke execute on function public.close_review(uuid, uuid, timestamptz, text, inet, text) from public, anon, authenticated;
grant execute on function public.close_review(uuid, uuid, timestamptz, text, inet, text) to service_role;

-- La versión anterior (5 args) deja de ser ejecutable por los usuarios: cierra el bypass de MED-01.
revoke execute on function public.close_review(uuid, timestamptz, text, inet, text) from public, anon, authenticated;
