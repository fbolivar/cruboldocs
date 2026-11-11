-- 053 — Notificaciones Slack/Teams (v1.4-7). Arquitectura: docs/notificaciones/ARQUITECTURA.md,
-- ADR-100/101/102. Reusa el patrón de webhooks: triggers AFTER INSERT encolan en chat_outbox y la
-- entrega (app) formatea por proveedor y hace POST. Solo Admin configura (la URL es un secreto).
-- Eventos: 'nc', 'pqrs', 'salida', 'solicitud'. Sin PII (solo code + título recortado).

-- 053a · Tablas
create table public.chat_notifiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  provider text not null check (provider in ('slack', 'teams')),
  url text not null,
  name text not null check (length(trim(name)) between 2 and 80),
  events text[] not null default '{}',
  enabled boolean not null default true,
  removed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on public.chat_notifiers (organization_id);

create table public.chat_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  notifier_id uuid not null,
  event text not null,
  code text not null default '',
  title text not null default '',
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'fallido')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  foreign key (notifier_id, organization_id) references public.chat_notifiers (id, organization_id) on delete cascade
);
create index on public.chat_outbox (status, next_attempt_at) where status = 'pendiente';

alter table public.chat_notifiers enable row level security;
alter table public.chat_outbox enable row level security;
-- Solo Admin/Líder SIG (la URL es un secreto); el canal eliminado (removed_at) no se lista.
create policy chat_notifier_select on public.chat_notifiers for select to authenticated using (public.can_manage_org(organization_id) and removed_at is null);
create policy chat_outbox_select on public.chat_outbox for select to authenticated using (public.can_manage_org(organization_id));

-- 053b · Encolado y disparadores
create or replace function public.enqueue_chat(p_org uuid, p_event text, p_code text, p_title text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_outbox (organization_id, notifier_id, event, code, title)
  select n.organization_id, n.id, p_event, coalesce(p_code, ''), left(coalesce(p_title, ''), 120)
  from public.chat_notifiers n
  where n.organization_id = p_org and n.enabled and n.removed_at is null and p_event = any(n.events);
end $$;

-- Se re-crean los triggers de webhooks para además encolar el chat (sin perder el webhook).
create or replace function public.tg_webhook_nonconformity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'nonconformity.created', jsonb_build_object(
    'code', new.code, 'status', new.status, 'severity', new.severity, 'source', new.source,
    'title', new.title, 'detectedAt', new.detected_at,
    'process', (select p.name from public.processes p where p.id = new.process_id)));
  perform public.enqueue_chat(new.organization_id, 'nc', new.code, new.title);
  return new;
end $$;

create or replace function public.tg_webhook_pqrs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'pqrs.created', jsonb_build_object(
    'code', new.code, 'type', new.type, 'channel', new.channel, 'status', new.status));
  perform public.enqueue_chat(new.organization_id, 'pqrs', new.code, new.type);
  return new;
end $$;

create or replace function public.tg_webhook_nc_output() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_webhook(new.organization_id, 'nonconforming_output.created', jsonb_build_object(
    'code', new.code, 'status', new.status));
  perform public.enqueue_chat(new.organization_id, 'salida', new.code, '');
  return new;
end $$;

create or replace function public.tg_chat_solicitud() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_chat(new.organization_id, 'solicitud', new.code, new.title);
  return new;
end $$;
create trigger chat_solicitud after insert on public.approval_requests for each row execute function public.tg_chat_solicitud();

-- Encolado y triggers nunca los ejecuta el usuario directamente.
revoke execute on function public.enqueue_chat(uuid, text, text, text), public.tg_chat_solicitud() from public, anon, authenticated;

-- 053c · RPCs de configuración (solo Admin)
create or replace function public.create_chat_notifier(p_org uuid, p_provider text, p_url text, p_name text, p_events text[])
returns table (id uuid) language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.can_manage_org(p_org) then
    raise exception 'No puedes configurar notificaciones' using errcode = '42501';
  end if;
  if p_provider not in ('slack', 'teams') then
    raise exception 'Proveedor no válido' using errcode = '22023';
  end if;
  if coalesce(array_length(p_events, 1), 0) = 0 then
    raise exception 'Elige al menos un evento' using errcode = '22023';
  end if;
  insert into public.chat_notifiers (organization_id, provider, url, name, events)
  values (p_org, p_provider, trim(p_url), trim(p_name), p_events)
  returning chat_notifiers.id into v_id;
  perform public.log_event(p_org, 'crear_notificador', 'Notificacion', v_id, trim(p_name));
  return query select v_id;
end $$;

create or replace function public.update_chat_notifier(p_notifier uuid, p_url text, p_name text, p_events text[], p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.chat_notifiers;
begin
  select * into n from public.chat_notifiers where id = p_notifier and removed_at is null;
  if n.id is null or not public.can_manage_org(n.organization_id) then
    raise exception 'Notificador no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if coalesce(array_length(p_events, 1), 0) = 0 then
    raise exception 'Elige al menos un evento' using errcode = '22023';
  end if;
  update public.chat_notifiers
    set url = trim(p_url), name = trim(p_name), events = p_events, enabled = coalesce(p_enabled, enabled), updated_at = now()
    where id = p_notifier;
  perform public.log_event(n.organization_id, 'editar_notificador', 'Notificacion', p_notifier, trim(p_name));
end $$;

create or replace function public.discard_chat_notifier(p_notifier uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.chat_notifiers;
begin
  select * into n from public.chat_notifiers where id = p_notifier and removed_at is null;
  if n.id is null or not public.can_manage_org(n.organization_id) then
    raise exception 'Notificador no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  update public.chat_notifiers set removed_at = now(), enabled = false where id = p_notifier;
  perform public.log_event(n.organization_id, 'eliminar_notificador', 'Notificacion', p_notifier, n.name);
end $$;

revoke execute on function public.create_chat_notifier(uuid, text, text, text, text[]), public.update_chat_notifier(uuid, text, text, text[], boolean), public.discard_chat_notifier(uuid) from public, anon;
grant execute on function public.create_chat_notifier(uuid, text, text, text, text[]), public.update_chat_notifier(uuid, text, text, text[], boolean), public.discard_chat_notifier(uuid) to authenticated;
