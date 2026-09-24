-- 012 · Privilegios (AUD-20260924: ALTA-04, ALTA-05, MED-01, MED-08, BAJ-05).
-- 1. Superadmin: solo con segundo factor (aal2) y solo metadatos de la plataforma
--    (organizaciones y conteo de usuarios). No lee documentos, riesgos, catálogos ni personas
--    de los clientes, no es admin de ninguna organización y no se da acceso a sí mismo.
-- 2. Toda escritura en tablas administrables deja traza en la base (triggers), sin depender
--    de la aplicación. Nadie cambia los roles de su propio cargo ni su propia membresía.
-- 3. Membresías: sin insert por REST (solo al aceptar una invitación), update por columnas,
--    solo un Admin modifica el acceso de otro Admin.
-- 4. Correos de las personas: fuera de REST; los administradores los leen por función.

-- ---------------------------------------------------------------------------
-- 1. Superadmin
-- ---------------------------------------------------------------------------

/** Superadmin con sesión de segundo factor (aal2). Sin MFA no tiene ningún privilegio. */
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
$$;

/** La cuenta de la sesión es de Superadmin (sin mirar aal): la app la usa para exigir el MFA. */
create or replace function public.is_platform_admin_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;

revoke execute on function public.is_platform_admin_account from public, anon;
grant execute on function public.is_platform_admin_account to authenticated;

create or replace function public.is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.is_org_admin and public.is_active_member(org)
  )
$$;

create or replace function public.is_org_admin_as(org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member_of(org, p_user) and exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = p_user and m.is_org_admin
  )
$$;

create or replace function public.can_see_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_doc
      and public.is_active_member(d.organization_id)
      and (d.current_version_id is not null or public.is_document_participant(d.id))
  )
$$;

create or replace function public.can_see_risks(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.org_directory(org uuid)
returns table (user_id uuid, full_name text, position_id uuid, position_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, m.position_id, pos.name
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  left join public.positions pos on pos.id = m.position_id
  where m.organization_id = org
    and m.status = 'activo'
    and current_date >= m.valid_from
    and (m.valid_until is null or current_date <= m.valid_until)
    and public.is_active_member(org)
$$;

create or replace function public.set_active_org(org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_member(org) then
    raise exception 'No perteneces a esta organización' using errcode = '42501';
  end if;
  update public.profiles set active_org = org where id = auth.uid();
end $$;

-- Catálogos y perfiles: solo miembros vigentes (el Superadmin ya no los lee).
drop policy process_select on public.processes;
create policy process_select on public.processes for select to authenticated
  using (public.is_active_member(organization_id));
drop policy position_select on public.positions;
create policy position_select on public.positions for select to authenticated
  using (public.is_active_member(organization_id));
drop policy position_role_select on public.position_roles;
create policy position_role_select on public.position_roles for select to authenticated
  using (public.is_active_member(organization_id));
drop policy doctype_select on public.document_types;
create policy doctype_select on public.document_types for select to authenticated
  using (public.is_active_member(organization_id));
drop policy profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));

-- Organizaciones: se crean solo por create_organization (servidor); nadie las edita por REST.
drop policy org_insert on public.organizations;
drop policy org_update on public.organizations;

/** Organizaciones con su número de usuarios vigentes (solo Superadmin con MFA). */
create function public.platform_organizations()
returns table (id uuid, name text, nit text, status text, created_at timestamptz, user_count int,
  pending_admin_invitation uuid)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.nit, o.status, o.created_at,
    (select count(*)::int from public.memberships m
      where m.organization_id = o.id and m.status = 'activo'
        and current_date >= m.valid_from and (m.valid_until is null or current_date <= m.valid_until)),
    (select i.id from public.invitations i
      where i.organization_id = o.id and i.is_org_admin and i.accepted_at is null
        and not exists (select 1 from public.memberships m where m.organization_id = o.id and m.is_org_admin and m.status = 'activo')
      order by i.created_at desc limit 1)
  from public.organizations o
  where public.is_platform_admin()
  order by o.name
$$;

revoke execute on function public.platform_organizations from public, anon;
grant execute on function public.platform_organizations to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Traza en la base de toda escritura administrativa
-- ---------------------------------------------------------------------------

/** Actor: el usuario de la sesión o, en funciones de servidor, el que declaran en `app.actor`. */
create or replace function public.current_actor() returns uuid
language sql stable set search_path = '' as $$
  select coalesce((select auth.uid()), nullif(current_setting('app.actor', true), '')::uuid)
$$;

revoke execute on function public.current_actor from public, anon, authenticated;

create or replace function public.audit_admin_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  v_org uuid := case when tg_table_name = 'organizations' then (r ->> 'id')::uuid else (r ->> 'organization_id')::uuid end;
  v_diff jsonb := '{}';
  v_changed text[] := '{}';
  k text;
  v_action text;
  v_entity text;
  v_id uuid := (r ->> 'id')::uuid;
  v_label text;
  v_verb text := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end;
begin
  -- Borrado en cascada de la organización: no queda organización a la cual atribuirlo.
  if not exists (select 1 from public.organizations where id = v_org) then
    return null;
  end if;
  for k in select jsonb_object_keys(r) loop
    continue when k in ('id', 'organization_id', 'created_at', 'updated_at', 'token_hash');
    if (o -> k) is distinct from (n -> k) then
      v_changed := v_changed || k;
      v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('before', o -> k, 'after', n -> k));
    end if;
  end loop;
  if tg_op = 'UPDATE' and cardinality(v_changed) = 0 and (o ->> 'token_hash') is not distinct from (n ->> 'token_hash') then
    return null;
  end if;

  case tg_table_name
  when 'organizations' then
    v_action := v_verb || '_organizacion'; v_entity := 'Organización';
    v_label := (r ->> 'name') || ' (' || (r ->> 'nit') || ')';
  when 'processes' then
    v_action := v_verb || '_proceso'; v_entity := 'Proceso';
    v_label := (r ->> 'code') || ' ' || (r ->> 'name');
  when 'document_types' then
    v_action := v_verb || '_tipo'; v_entity := 'Tipo documental';
    v_label := (r ->> 'code') || ' ' || (r ->> 'name');
  when 'positions' then
    v_action := v_verb || '_cargo'; v_entity := 'Cargo';
    v_label := r ->> 'name';
  when 'position_roles' then
    v_action := case tg_op when 'INSERT' then 'asignar_rol' when 'DELETE' then 'quitar_rol' else 'editar_rol' end;
    v_entity := 'Cargo';
    v_id := (r ->> 'position_id')::uuid;
    v_label := coalesce((select name from public.positions where id = v_id), 'Cargo') || ': ' || (r ->> 'role');
  when 'memberships' then
    -- La recertificación ya queda en access_recertifications.
    if tg_op = 'UPDATE' and v_changed <@ array['last_recertified_at'] then
      return null;
    end if;
    v_action := case
      when tg_op = 'UPDATE' and (n ->> 'status') = 'revocado' and (o ->> 'status') <> 'revocado' then 'revocar_acceso'
      when tg_op = 'UPDATE' then 'editar_acceso'
      when tg_op = 'INSERT' then 'crear_acceso'
      else 'eliminar_acceso' end;
    v_entity := 'Membresía';
    v_label := (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = (r ->> 'user_id')::uuid);
  when 'invitations' then
    -- La aceptación la registra accept_invitation (con la aceptación de la política de datos).
    if tg_op = 'UPDATE' and v_changed <@ array['accepted_at'] and (o ->> 'token_hash') = (n ->> 'token_hash') then
      return null;
    end if;
    v_action := case
      when tg_op = 'INSERT' then 'invitar_usuario'
      when tg_op = 'DELETE' then 'cancelar_invitacion'
      when (o ->> 'token_hash') <> (n ->> 'token_hash') then 'reenviar_invitacion'
      else 'editar_invitacion' end;
    v_entity := 'Membresía';
    v_label := r ->> 'email';
  when 'access_recertifications' then
    v_action := 'recertificar_acceso'; v_entity := 'Membresía';
    v_id := (r ->> 'membership_id')::uuid;
    v_label := (select coalesce(nullif(p.full_name, ''), p.email) from public.memberships m
      join public.profiles p on p.id = m.user_id where m.id = v_id);
  end case;

  perform public.log_event(v_org, v_action, v_entity, v_id, coalesce(v_label, ''), v_diff, public.current_actor());
  return null;
end $$;

revoke execute on function public.audit_admin_change from public, anon, authenticated;

create trigger t_audit after insert or update or delete on public.organizations
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.processes
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.document_types
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.positions
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.position_roles
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.memberships
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.invitations
  for each row execute function public.audit_admin_change();
create trigger t_audit after insert or update or delete on public.access_recertifications
  for each row execute function public.audit_admin_change();

-- ---------------------------------------------------------------------------
-- 3. Separación de funciones en la administración
-- ---------------------------------------------------------------------------

/** Nadie cambia los roles de su propio cargo (evitaría "admin solo metadatos"). */
create or replace function public.guard_own_position_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.position_roles := coalesce(new, old);
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  if public.my_position(r.organization_id) in (old.position_id, new.position_id) then
    raise exception 'No puedes cambiar los roles de tu propio cargo. Pídeselo a otro administrador.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger t_guard_own before insert or update or delete on public.position_roles
  for each row execute function public.guard_own_position_roles();

/** Nadie edita su propia membresía; solo un Admin modifica el acceso de otro Admin. */
create or replace function public.guard_membership_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if old.user_id = (select auth.uid()) then
    raise exception 'No puedes modificar tu propio acceso. Pídeselo a otro administrador.' using errcode = '42501';
  end if;
  -- Recertificar (solo la fecha) no es modificar el acceso.
  if old.is_org_admin and not public.is_org_admin(old.organization_id)
    and (new.position_id, new.valid_until, new.status) is distinct from (old.position_id, old.valid_until, old.status) then
    raise exception 'Solo un administrador modifica el acceso de otro administrador.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger t_guard before update on public.memberships
  for each row execute function public.guard_membership_update();

/** Solo un Admin modifica o cancela la invitación de un administrador. */
create or replace function public.guard_invitation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and old.is_org_admin and not public.is_org_admin(old.organization_id) then
    raise exception 'Solo un administrador modifica la invitación de otro administrador.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger t_guard before update or delete on public.invitations
  for each row execute function public.guard_invitation_change();

revoke execute on function public.guard_own_position_roles, public.guard_membership_update,
  public.guard_invitation_change from public, anon, authenticated;

-- Membresías: se crean solo al aceptar una invitación; se editan cargo, vigencia y estado.
drop policy membership_insert on public.memberships;
revoke insert, update on public.memberships from authenticated, anon;
grant update (position_id, valid_until, status, last_recertified_at) on public.memberships to authenticated;

-- Invitaciones pendientes: Admin/Líder SIG cambian cargo y vigencia o las cancelan (token intocable).
revoke insert, update on public.invitations from authenticated, anon;
grant update (position_id, valid_until) on public.invitations to authenticated;
create policy invitation_update on public.invitations for update to authenticated
  using (public.can_manage_org(organization_id) and accepted_at is null)
  with check (public.can_manage_org(organization_id) and accepted_at is null);
create policy invitation_delete on public.invitations for delete to authenticated
  using (public.can_manage_org(organization_id) and accepted_at is null);

-- Recertificación: de la misma organización (BAJ-05) y nunca de la propia membresía.
alter table public.memberships add constraint memberships_id_org_key unique (id, organization_id);
alter table public.access_recertifications
  add constraint access_recertifications_membership_org_fkey
  foreign key (membership_id, organization_id) references public.memberships (id, organization_id) on delete cascade;
drop policy recert_insert on public.access_recertifications;
create policy recert_insert on public.access_recertifications for insert to authenticated
  with check (
    public.can_manage_org(organization_id)
    and reviewed_by = (select auth.uid())
    and not exists (select 1 from public.memberships m where m.id = membership_id and m.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 4. Correos de las personas (MED-08)
-- ---------------------------------------------------------------------------

revoke select on public.profiles from authenticated, anon;
grant select (id, full_name, active_org, created_at, updated_at) on public.profiles to authenticated;

/** Nombre y correo de los miembros (cualquier estado): solo Admin y Líder SIG de la organización. */
create function public.member_contacts(org uuid)
returns table (user_id uuid, full_name text, email text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.organization_id = org and public.can_manage_org(org)
$$;

revoke execute on function public.member_contacts from public, anon;
grant execute on function public.member_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones de servidor: el actor queda en `app.actor` para la traza de los triggers
-- ---------------------------------------------------------------------------

create or replace function public.create_invitation(
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
  perform set_config('app.actor', p_actor::text, true);
  insert into public.invitations (organization_id, email, position_id, is_org_admin, is_external,
    valid_until, token_hash, invited_by)
  values (p_org, v_email, p_position, p_is_org_admin, p_is_external,
    case when p_is_external then p_valid_until end, p_token_hash, p_actor)
  returning invitations.id, invitations.expires_at into v_id, v_expires;
  return query select v_id, v_expires;
end $$;

/**
 * Nuevo token y vigencia para una invitación pendiente. El Superadmin solo puede reenviar la
 * del administrador inicial mientras la organización no tenga un administrador activo.
 */
create or replace function public.reissue_invitation(p_actor uuid, p_invitation uuid, p_token_hash text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; v_expires timestamptz := now() + interval '7 days';
begin
  select * into inv from public.invitations where id = p_invitation for update;
  if inv.id is null or inv.accepted_at is not null then
    raise exception 'Solo se reenvían invitaciones pendientes.' using errcode = '22023';
  end if;
  if p_actor is null or not (
    public.can_manage_org_as(inv.organization_id, p_actor)
    or (public.is_platform_admin_user(p_actor) and inv.is_org_admin and not exists (
      select 1 from public.memberships m
      where m.organization_id = inv.organization_id and m.is_org_admin and m.status = 'activo'))
  ) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  if inv.is_org_admin and not public.is_org_admin_as(inv.organization_id, p_actor)
    and not public.is_platform_admin_user(p_actor) then
    raise exception 'Solo un administrador reenvía la invitación de otro administrador.' using errcode = '42501';
  end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitación inválida' using errcode = '22023';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  update public.invitations set token_hash = p_token_hash, expires_at = v_expires where id = inv.id;
  delete from public.email_outbox
  where organization_id = inv.organization_id and to_email = inv.email
    and template = 'invitacion' and status = 'pendiente';
  return v_expires;
end $$;

create or replace function public.accept_invitation(p_token_hash text, p_user uuid, p_full_name text default null)
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
  perform set_config('app.actor', p_user::text, true);

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

/**
 * Alta de una organización por el Superadmin: organización, cargo "Administrador" e invitación
 * a su administrador. El servidor verifica antes la sesión aal2 del Superadmin.
 */
create function public.create_organization(
  p_actor uuid, p_name text, p_nit text, p_admin_email text, p_token_hash text
) returns table (organization_id uuid, position_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_pos uuid; v_expires timestamptz;
begin
  if p_actor is null or not public.is_platform_admin_user(p_actor) then
    raise exception 'No tienes permiso para esta acción.' using errcode = '42501';
  end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitación inválida' using errcode = '22023';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  insert into public.organizations (name, nit) values (trim(p_name), trim(p_nit)) returning id into v_org;
  insert into public.positions (organization_id, name) values (v_org, 'Administrador') returning id into v_pos;
  insert into public.invitations (organization_id, email, position_id, is_org_admin, token_hash, invited_by)
  values (v_org, lower(trim(p_admin_email)), v_pos, true, p_token_hash, p_actor)
  returning invitations.expires_at into v_expires;
  return query select v_org, v_pos, v_expires;
end $$;

revoke execute on function public.create_invitation, public.reissue_invitation, public.accept_invitation,
  public.create_organization from public, anon, authenticated;
grant execute on function public.create_invitation, public.reissue_invitation, public.accept_invitation,
  public.create_organization to service_role;
