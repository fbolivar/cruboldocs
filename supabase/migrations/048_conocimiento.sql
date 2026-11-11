-- 048 — Gestión del conocimiento (ISO 9001 7.1.6). Arquitectura: docs/conocimiento/ARQUITECTURA.md,
-- ADR-085/086/087. Base de conocimiento ligera (artículos categorizados), visible para todo miembro
-- activo; lección aprendida desde NC/auditoría con un clic. RLS solo-SELECT + escritura por RPC.

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  category text not null check (category in ('buenas_practicas','lecciones_aprendidas','know_how','faq')),
  content text not null check (length(trim(content)) between 1 and 20000),
  process_id uuid,
  source text,
  source_nc_id uuid references public.nonconformities on delete set null,
  source_audit_id uuid references public.audits on delete set null,
  status text not null default 'vigente' check (status in ('vigente','archivado')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);
create index on public.knowledge_articles (organization_id, category);

create table public.kn_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create or replace function public.can_manage_knowledge(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_manage_knowledge from public, anon;
grant execute on function public.can_manage_knowledge to authenticated;

alter table public.knowledge_articles enable row level security;
alter table public.kn_counters enable row level security; -- deny-all
-- Disponible para cualquier miembro activo (7.1.6).
create policy knowledge_select on public.knowledge_articles for select to authenticated using (public.is_active_member(organization_id));

create or replace function public.next_kn_code(p_org uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_year int; v_seq int;
begin
  v_year := extract(year from current_date)::int;
  insert into public.kn_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.kn_counters.last_seq + 1 returning last_seq into v_seq;
  return 'KN-' || v_year || '-' || lpad(v_seq::text, 3, '0');
end $$;

create or replace function public.create_knowledge_article(
  p_org uuid, p_title text, p_category text, p_process uuid, p_content text, p_source text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text;
begin
  if not public.can_manage_knowledge(p_org, p_process) then
    raise exception 'No puedes crear artículos de conocimiento' using errcode = '42501';
  end if;
  if p_category not in ('buenas_practicas','lecciones_aprendidas','know_how','faq') then
    raise exception 'Categoría no válida' using errcode = '22023';
  end if;
  v_code := public.next_kn_code(p_org);
  insert into public.knowledge_articles (organization_id, code, title, category, content, process_id, source)
  values (p_org, v_code, trim(p_title), p_category, trim(p_content), p_process, nullif(trim(coalesce(p_source,'')),''))
  returning knowledge_articles.id into v_id;
  perform public.log_event(p_org, 'crear_articulo', 'Conocimiento', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.article_or_fail(p_article uuid) returns public.knowledge_articles
language plpgsql stable security definer set search_path = '' as $$
declare a public.knowledge_articles;
begin
  select * into a from public.knowledge_articles where id = p_article;
  if a.id is null or not public.is_active_member(a.organization_id) then
    raise exception 'Artículo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return a;
end $$;

create or replace function public.update_knowledge_article(
  p_article uuid, p_title text, p_category text, p_process uuid, p_content text, p_source text
) returns void language plpgsql security definer set search_path = '' as $$
declare a public.knowledge_articles;
begin
  a := public.article_or_fail(p_article);
  if not public.can_manage_knowledge(a.organization_id, a.process_id) then
    raise exception 'No puedes editar este artículo' using errcode = '42501';
  end if;
  if p_category not in ('buenas_practicas','lecciones_aprendidas','know_how','faq') then
    raise exception 'Categoría no válida' using errcode = '22023';
  end if;
  update public.knowledge_articles set
    title = trim(p_title), category = p_category, process_id = p_process,
    content = trim(p_content), source = nullif(trim(coalesce(p_source,'')),''), updated_at = now()
  where id = a.id;
  perform public.log_event(a.organization_id, 'editar_articulo', 'Conocimiento', a.id, a.code, '{}');
end $$;

create or replace function public.set_article_archived(p_article uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.knowledge_articles;
begin
  a := public.article_or_fail(p_article);
  if not public.can_manage_knowledge(a.organization_id, a.process_id) then
    raise exception 'No puedes archivar este artículo' using errcode = '42501';
  end if;
  update public.knowledge_articles set status = case when p_archived then 'archivado' else 'vigente' end, updated_at = now()
  where id = a.id;
  perform public.log_event(a.organization_id, 'estado_articulo', 'Conocimiento', a.id, a.code, jsonb_build_object('archivado', p_archived));
end $$;

create or replace function public.create_article_from_nc(p_nc uuid)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities; v_id uuid; v_code text;
begin
  select * into n from public.nonconformities where nonconformities.id = p_nc;
  if n.id is null or not public.is_active_member(n.organization_id) then
    raise exception 'No conformidad no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_knowledge(n.organization_id, n.process_id) then
    raise exception 'No puedes registrar la lección' using errcode = '42501';
  end if;
  v_code := public.next_kn_code(n.organization_id);
  insert into public.knowledge_articles (organization_id, code, title, category, content, process_id, source, source_nc_id)
  values (n.organization_id, v_code, 'Lección — ' || n.code, 'lecciones_aprendidas',
    coalesce(n.title, '') || E'\n\n' || coalesce(n.description, ''), n.process_id, 'No conformidad ' || n.code, n.id)
  returning knowledge_articles.id into v_id;
  perform public.log_event(n.organization_id, 'leccion_desde_nc', 'Conocimiento', v_id, v_code, jsonb_build_object('nc', n.code));
  return query select v_id, v_code;
end $$;

create or replace function public.create_article_from_audit(p_audit uuid)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare au public.audits; v_id uuid; v_code text;
begin
  select * into au from public.audits where audits.id = p_audit;
  if au.id is null or not public.is_active_member(au.organization_id) then
    raise exception 'Auditoría no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_knowledge(au.organization_id, null) then
    raise exception 'No puedes registrar la lección' using errcode = '42501';
  end if;
  v_code := public.next_kn_code(au.organization_id);
  insert into public.knowledge_articles (organization_id, code, title, category, content, source, source_audit_id)
  values (au.organization_id, v_code, 'Lección — ' || au.code, 'lecciones_aprendidas',
    coalesce(au.title, '') || E'\n\n' || coalesce(au.conclusions, ''), 'Auditoría ' || au.code, au.id)
  returning knowledge_articles.id into v_id;
  perform public.log_event(au.organization_id, 'leccion_desde_auditoria', 'Conocimiento', v_id, v_code, jsonb_build_object('aud', au.code));
  return query select v_id, v_code;
end $$;

revoke execute on function public.article_or_fail, public.next_kn_code from public, anon, authenticated;
revoke execute on function public.create_knowledge_article, public.update_knowledge_article, public.set_article_archived,
  public.create_article_from_nc, public.create_article_from_audit from public, anon;
grant execute on function public.create_knowledge_article, public.update_knowledge_article, public.set_article_archived,
  public.create_article_from_nc, public.create_article_from_audit to authenticated;
