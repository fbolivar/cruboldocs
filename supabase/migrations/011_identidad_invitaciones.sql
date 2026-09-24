-- 011 · Identidad: invitaciones (AUD-20260924: ALTA-02, BAJ-01, BAJ-02; parte de MED-01).
-- 1. Nadie inserta invitaciones por PostgREST: el token lo genera el servidor y solo viaja
--    por correo. `create_invitation` y `reissue_invitation` son de service_role con actor explícito.
-- 2. Solo un administrador (o el Superadmin) invita administradores.
-- 3. `accept_invitation` es atómica (fila bloqueada, un solo uso) y exige que el correo de la
--    cuenta sea el invitado. La traza queda en la base, no en la aplicación.

drop policy invitation_insert on public.invitations;

/** ¿El actor es Superadmin? */
create or replace function public.is_platform_admin_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = p_user)
$$;

/** Admin de la organización (membresía vigente) o Superadmin. */
create or replace function public.is_org_admin_as(org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin_user(p_user) or (
    public.is_member_of(org, p_user) and exists (
      select 1 from public.memberships m
      where m.organization_id = org and m.user_id = p_user and m.is_org_admin
    )
  )
$$;

/** Admin, Líder SIG o Superadmin (equivalente a can_manage_org para un actor explícito). */
create or replace function public.can_manage_org_as(org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_org_admin_as(org, p_user) or exists (
    select 1 from public.position_roles pr
    where pr.organization_id = org and pr.role = 'lider_sig'
      and pr.position_id = public.position_of(org, p_user)
  )
$$;

revoke execute on function public.is_platform_admin_user, public.is_org_admin_as, public.can_manage_org_as
  from public, anon, authenticated;

create function public.create_invitation(
  p_actor uuid, p_org uuid, p_email text, p_position uuid, p_is_org_admin boolean,
  p_is_external boolean, p_valid_until date, p_token_hash text
) returns table (id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email)); v_id uuid; v_expires timestamptz;
begin
  if p_actor is null or not public.can_manage_org_as(p_org, p_actor) then
    raise exception 'No tienes permiso para invitar usuarios' using errcode = '42501';
  end if;
  if p_is_org_admin and not public.is_org_admin_as(p_org, p_actor) then
    raise exception 'Solo un administrador puede invitar administradores' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_org and o.status = 'activa') then
    raise exception 'La organización no está activa' using errcode = '22023';
  end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitación inválida' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.organization_id = p_org and m.status = 'activo' and lower(p.email) = v_email
  ) then
    raise exception 'Este correo ya pertenece a la organización.' using errcode = '22023';
  end if;
  insert into public.invitations (organization_id, email, position_id, is_org_admin, is_external,
    valid_until, token_hash, invited_by)
  values (p_org, v_email, p_position, p_is_org_admin, p_is_external,
    case when p_is_external then p_valid_until end, p_token_hash, p_actor)
  returning invitations.id, invitations.expires_at into v_id, v_expires;
  perform public.log_event(p_org, 'invitar_usuario', 'Membresía', v_id, v_email,
    jsonb_build_object('externo', p_is_external, 'admin', p_is_org_admin), p_actor);
  return query select v_id, v_expires;
end $$;

/** Nuevo token y vigencia para una invitación pendiente; descarta los correos con el token anterior. */
create function public.reissue_invitation(p_actor uuid, p_invitation uuid, p_token_hash text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; v_expires timestamptz := now() + interval '7 days';
begin
  select * into inv from public.invitations where id = p_invitation for update;
  if inv.id is null or inv.accepted_at is not null then
    raise exception 'Solo se reenvían invitaciones pendientes.' using errcode = '22023';
  end if;
  if p_actor is null or not public.can_manage_org_as(inv.organization_id, p_actor) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitación inválida' using errcode = '22023';
  end if;
  update public.invitations set token_hash = p_token_hash, expires_at = v_expires where id = inv.id;
  delete from public.email_outbox
  where organization_id = inv.organization_id and to_email = inv.email
    and template = 'invitacion' and status = 'pendiente';
  perform public.log_event(inv.organization_id, 'reenviar_invitacion', 'Membresía', inv.id, inv.email, '{}', p_actor);
  return v_expires;
end $$;

/**
 * Acepta la invitación para una cuenta ya autenticada por el servidor. Un solo uso (fila
 * bloqueada) y solo si el correo de la cuenta es el invitado. Devuelve la organización.
 */
create function public.accept_invitation(p_token_hash text, p_user uuid, p_full_name text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; v_email text; v_position text;
begin
  select * into inv from public.invitations where token_hash = p_token_hash for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at < now()
    or not exists (select 1 from public.organizations o where o.id = inv.organization_id and o.status = 'activa') then
    raise exception 'Esta invitación venció o ya fue usada.' using errcode = '22023';
  end if;
  select lower(p.email) into v_email from public.profiles p where p.id = p_user;
  if v_email is null or v_email <> lower(inv.email) then
    raise exception 'Esta invitación es para otro correo.' using errcode = '42501';
  end if;

  insert into public.memberships (organization_id, user_id, position_id, is_org_admin, is_external,
    valid_from, valid_until, status, last_recertified_at)
  values (inv.organization_id, p_user, inv.position_id, inv.is_org_admin, inv.is_external,
    current_date, inv.valid_until, 'activo', now())
  on conflict (organization_id, user_id) do update set
    position_id = excluded.position_id, is_org_admin = excluded.is_org_admin,
    is_external = excluded.is_external, valid_from = excluded.valid_from,
    valid_until = excluded.valid_until, status = 'activo', last_recertified_at = now();

  update public.invitations set accepted_at = now() where id = inv.id;
  update public.profiles set active_org = inv.organization_id,
    full_name = coalesce(nullif(left(trim(p_full_name), 200), ''), full_name)
  where id = p_user;

  select name into v_position from public.positions where id = inv.position_id;
  perform public.log_event(inv.organization_id, 'aceptar_invitacion', 'Membresía', inv.id,
    coalesce(v_position, inv.email),
    jsonb_build_object('politica_datos', jsonb_build_object('before', null, 'after', 'aceptada ' || now())),
    p_user);
  return inv.organization_id;
end $$;

revoke execute on function public.create_invitation, public.reissue_invitation, public.accept_invitation
  from public, anon, authenticated;
grant execute on function public.create_invitation, public.reissue_invitation, public.accept_invitation
  to service_role;
