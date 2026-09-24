-- 013 — Correcciones de la re-auditoría (AUD-20260924, sección 6)
-- RA-03: una invitación pendiente no reescribe una membresía activa ni sobrevive a la revocación.
-- RA-04: la traza no copia el texto de los comentarios de revisión.
-- RA-10: la firma se registra solo si el PDF es el que verificó el servidor.
-- RA-14: la fecha de recertificación la fija la base al recertificar, no el cliente.
-- RA-15: la traza no guarda correos completos.

-- ---------------------------------------------------------------------------
-- RA-03 — invitaciones
-- ---------------------------------------------------------------------------

-- Una sola invitación pendiente por correo y organización.
create unique index invitations_pending_email on public.invitations (organization_id, lower(email))
  where accepted_at is null;

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
  if exists (
    select 1 from public.invitations i
    where i.organization_id = p_org and lower(i.email) = v_email and i.accepted_at is null
  ) then
    raise exception 'Ya hay una invitación pendiente para este correo. Reenvíala desde la lista de usuarios.' using errcode = '22023';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  insert into public.invitations (organization_id, email, position_id, is_org_admin, is_external,
    valid_until, token_hash, invited_by)
  values (p_org, v_email, p_position, p_is_org_admin, p_is_external,
    case when p_is_external then p_valid_until end, p_token_hash, p_actor)
  returning invitations.id, invitations.expires_at into v_id, v_expires;
  return query select v_id, v_expires;
end $$;

/** Aceptar nunca reescribe un acceso activo: el cambio de cargo o de administración va por la gestión de usuarios. */
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
  if exists (
    select 1 from public.memberships m
    where m.organization_id = inv.organization_id and m.user_id = p_user and m.status = 'activo'
  ) then
    raise exception 'Ya tienes acceso a esta organización.' using errcode = '22023';
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
    coalesce(v_position, 'Invitación'),
    jsonb_build_object('politica_datos', jsonb_build_object('before', null, 'after', 'aceptada ' || now())),
    p_user);
  return inv.organization_id;
end $$;

revoke execute on function public.create_invitation, public.accept_invitation from public, anon, authenticated;
grant execute on function public.create_invitation, public.accept_invitation to service_role;

/** Al revocar o suspender un acceso se cancelan sus invitaciones pendientes en esa organización. */
create or replace function public.cancel_invitations_on_revoke() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'activo' and old.status = 'activo' then
    delete from public.invitations i
    using public.profiles p
    where p.id = new.user_id and i.organization_id = new.organization_id
      and lower(i.email) = lower(p.email) and i.accepted_at is null;
  end if;
  return null;
end $$;

revoke execute on function public.cancel_invitations_on_revoke from public, anon, authenticated;

create trigger t_cancel_invitations after update of status on public.memberships
  for each row execute function public.cancel_invitations_on_revoke();

/**
 * Solo un Admin modifica o cancela la invitación de un administrador, y nadie toca una invitación
 * dirigida a su propio correo. Las cancelaciones que hace la base (revocación) no pasan por aquí.
 */
create or replace function public.guard_invitation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  if exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(p.email) = lower(old.email)) then
    raise exception 'No puedes modificar una invitación dirigida a tu propio correo.' using errcode = '42501';
  end if;
  if old.is_org_admin and not public.is_org_admin(old.organization_id) then
    raise exception 'Solo un administrador modifica la invitación de otro administrador.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- RA-04 — la traza guarda el id del comentario, no su texto
-- ---------------------------------------------------------------------------

create or replace function public.return_version(p_version uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.document_versions; d public.documents; v_pos uuid; v_action text; v_comment uuid;
begin
  v := public.version_or_fail(p_version);
  d := public.doc_or_fail(v.document_id);
  v_pos := public.my_position(d.organization_id);
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Explica el motivo en al menos 10 caracteres' using errcode = '22023';
  end if;
  if v.status = 'en_revision' and v_pos = d.revisor_position_id then
    v_action := 'devolver';
    perform public.complete_tasks('revisar', v.id);
  elsif v.status = 'en_aprobacion' and v_pos = d.aprobador_position_id then
    v_action := 'rechazar';
    perform public.complete_tasks('aprobar', v.id);
  else
    raise exception 'No puedes devolver esta versión' using errcode = '42501';
  end if;

  update public.document_versions set status = 'borrador', reviewed_by = null where id = v.id;
  update public.documents set status = case when current_version_id is null then 'borrador' else 'vigente' end
  where id = d.id;
  insert into public.review_comments (organization_id, version_id, author_id, body)
  values (d.organization_id, v.id, auth.uid(), trim(p_reason))
  returning id into v_comment;
  perform public.create_task(d.organization_id, 'corregir', d.elaborador_position_id, 'version', v.id,
    d.code, d.title, v.version_no, null, now() + interval '5 days');
  perform public.log_event(d.organization_id, v_action, 'Documento', d.id, d.code || ' v' || v.version_no,
    jsonb_build_object('estado', jsonb_build_object('before', v.status, 'after', 'borrador'),
      'comentario', jsonb_build_object('before', null, 'after', v_comment)));
end $$;

-- ---------------------------------------------------------------------------
-- RA-10 — firmar solo el PDF verificado
-- ---------------------------------------------------------------------------

/** Bloquea la versión y firma solo si su PDF sigue siendo el que el servidor comparó. */
create function public.sign_version_checked(
  p_version uuid, p_signer uuid, p_action text, p_meaning text, p_ip inet, p_user_agent text, p_expected_sha256 text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_sha text;
begin
  select pdf_sha256 into v_sha from public.document_versions where id = p_version for update;
  if v_sha is null or v_sha is distinct from p_expected_sha256 then
    raise exception 'El documento cambió mientras firmabas. Vuelve a abrirlo y revísalo antes de firmar.' using errcode = '22023';
  end if;
  return public.sign_version(p_version, p_signer, p_action, p_meaning, p_ip, p_user_agent);
end $$;

revoke execute on function public.sign_version_checked from public, anon, authenticated;
grant execute on function public.sign_version_checked to service_role;

-- ---------------------------------------------------------------------------
-- RA-14 — la fecha de recertificación sale de access_recertifications
-- ---------------------------------------------------------------------------

revoke update on public.memberships from authenticated;
grant update (position_id, valid_until, status) on public.memberships to authenticated;

create or replace function public.stamp_recertification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.memberships set last_recertified_at = new.at where id = new.membership_id;
  return null;
end $$;

revoke execute on function public.stamp_recertification from public, anon, authenticated;

create trigger t_stamp after insert on public.access_recertifications
  for each row execute function public.stamp_recertification();

-- ---------------------------------------------------------------------------
-- RA-15 — la traza de administración sin correos completos
-- ---------------------------------------------------------------------------

create or replace function public.mask_email(p_email text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(p_email, ''), '^(.)[^@]*(@.*)$', '\1***\2')
$$;

revoke execute on function public.mask_email from public, anon, authenticated;

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
    continue when k in ('id', 'organization_id', 'created_at', 'updated_at', 'token_hash', 'email');
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
    v_label := (select coalesce(nullif(p.full_name, ''), 'Usuario sin nombre') from public.profiles p where p.id = (r ->> 'user_id')::uuid);
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
    v_label := public.mask_email(r ->> 'email');
  when 'access_recertifications' then
    v_action := 'recertificar_acceso'; v_entity := 'Membresía';
    v_id := (r ->> 'membership_id')::uuid;
    v_label := (select coalesce(nullif(p.full_name, ''), 'Usuario sin nombre') from public.memberships m
      join public.profiles p on p.id = m.user_id where m.id = v_id);
  end case;

  perform public.log_event(v_org, v_action, v_entity, v_id, coalesce(v_label, ''), v_diff, public.current_actor());
  return null;
end $$;
