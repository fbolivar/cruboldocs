-- 040 — Capacitación / LMS (ISO 9001 7.2). Arquitectura: docs/pwa-lms/ARQUITECTURA.md (4b), ADR-059.
-- Cursos con material + evaluación de opción múltiple (respuesta única) AUTO-CALIFICADA EN EL
-- SERVIDOR (umbral de aprobación) + constancia. Al TOMAR el curso, las preguntas se entregan SIN la
-- respuesta correcta (RPC definer). RLS solo-SELECT + escritura por RPC. Aplicada por fragmentos.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  description text,
  content text,
  process_id uuid,
  passing_score int not null default 70 check (passing_score between 0 and 100),
  status text not null default 'borrador' check (status in ('borrador','publicado','archivado')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.course_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  course_id uuid not null,
  order_index int not null default 0,
  text text not null check (length(trim(text)) between 1 and 500),
  options jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  course_id uuid not null,
  user_id uuid not null default auth.uid(),
  status text not null check (status in ('aprobado','no_aprobado')),
  score numeric(5,2) not null,
  answers jsonb,
  completed_at timestamptz not null default now(),
  unique (course_id, user_id),
  unique (id, organization_id),
  foreign key (course_id, organization_id) references public.courses (id, organization_id) on delete cascade
);

create table public.course_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.courses (organization_id, status);
create index on public.course_questions (course_id, organization_id);
create index on public.course_enrollments (course_id, organization_id);

create or replace function public.can_see_courses(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_courses(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_courses, public.can_manage_courses from public, anon;
grant execute on function public.can_see_courses, public.can_manage_courses to authenticated;

alter table public.courses enable row level security;
alter table public.course_questions enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_counters enable row level security; -- deny-all

create policy course_select on public.courses for select to authenticated using (public.can_see_courses(organization_id));
create policy course_question_select on public.course_questions for select to authenticated using (public.can_see_courses(organization_id));
create policy enrollment_select on public.course_enrollments for select to authenticated using (public.can_see_courses(organization_id) or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Ciclo de vida (curso y preguntas)
-- ---------------------------------------------------------------------------

create or replace function public.create_course(p_org uuid, p_title text, p_process uuid, p_description text, p_passing int)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_courses(p_org, p_process) then
    raise exception 'No puedes crear cursos' using errcode = '42501';
  end if;
  if p_passing < 0 or p_passing > 100 then
    raise exception 'Umbral de aprobación no válido' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.course_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.course_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'CAP-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.courses (organization_id, code, title, process_id, description, passing_score, status, created_by)
  values (p_org, v_code, trim(p_title), p_process, nullif(trim(coalesce(p_description,'')),''), coalesce(p_passing, 70), 'borrador', auth.uid())
  returning courses.id into v_id;
  perform public.log_event(p_org, 'crear_curso', 'Capacitacion', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.course_or_fail(p_course uuid) returns public.courses
language plpgsql stable security definer set search_path = '' as $$
declare c public.courses;
begin
  select * into c from public.courses where id = p_course;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Curso no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return c;
end $$;

create or replace function public.update_course_data(p_course uuid, p_title text, p_process uuid, p_description text, p_content text, p_passing int)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.courses;
begin
  c := public.course_or_fail(p_course);
  if not public.can_manage_courses(c.organization_id, c.process_id) then
    raise exception 'No puedes editar este curso' using errcode = '42501';
  end if;
  if c.status = 'archivado' then
    raise exception 'El curso archivado ya no es editable' using errcode = '22023';
  end if;
  if p_passing < 0 or p_passing > 100 then
    raise exception 'Umbral de aprobación no válido' using errcode = '22023';
  end if;
  update public.courses set
    title = trim(p_title), process_id = p_process, description = nullif(trim(coalesce(p_description,'')),''),
    content = nullif(trim(coalesce(p_content,'')),''), passing_score = coalesce(p_passing, c.passing_score), updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'editar_curso', 'Capacitacion', c.id, c.code, '{}');
end $$;

create or replace function public.valid_question_options(p_options jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p_options) = 'array'
    and jsonb_array_length(p_options) >= 2
    and (select count(*) from jsonb_array_elements(p_options) o where (o->>'correct')::boolean) = 1
    and not exists (select 1 from jsonb_array_elements(p_options) o where nullif(trim(coalesce(o->>'text','')),'') is null)
$$;

create or replace function public.add_course_question(p_course uuid, p_text text, p_options jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.courses; v_id uuid; v_order int;
begin
  c := public.course_or_fail(p_course);
  if not public.can_manage_courses(c.organization_id, c.process_id) then
    raise exception 'No puedes editar este curso' using errcode = '42501';
  end if;
  if c.status <> 'borrador' then
    raise exception 'Solo puedes editar las preguntas de un curso en borrador' using errcode = '22023';
  end if;
  if not public.valid_question_options(p_options) then
    raise exception 'La pregunta necesita al menos 2 opciones y exactamente una correcta' using errcode = '22023';
  end if;
  select coalesce(max(order_index), 0) + 1 into v_order from public.course_questions where course_id = c.id and is_active;
  insert into public.course_questions (organization_id, course_id, order_index, text, options)
  values (c.organization_id, c.id, v_order, trim(p_text), p_options)
  returning course_questions.id into v_id;
  update public.courses set updated_at = now() where id = c.id;
  return v_id;
end $$;

create or replace function public.question_course(p_question uuid) returns public.courses
language plpgsql stable security definer set search_path = '' as $$
declare q public.course_questions; c public.courses;
begin
  select * into q from public.course_questions where id = p_question;
  if q.id is null or not public.is_active_member(q.organization_id) then
    raise exception 'Pregunta no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  select * into c from public.courses where id = q.course_id;
  if not public.can_manage_courses(c.organization_id, c.process_id) then
    raise exception 'No puedes editar este curso' using errcode = '42501';
  end if;
  if c.status <> 'borrador' then
    raise exception 'Solo puedes editar las preguntas de un curso en borrador' using errcode = '22023';
  end if;
  return c;
end $$;

create or replace function public.update_course_question(p_question uuid, p_text text, p_options jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.courses;
begin
  c := public.question_course(p_question);
  if not public.valid_question_options(p_options) then
    raise exception 'La pregunta necesita al menos 2 opciones y exactamente una correcta' using errcode = '22023';
  end if;
  update public.course_questions set text = trim(p_text), options = p_options where id = p_question;
  update public.courses set updated_at = now() where id = c.id;
end $$;

create or replace function public.remove_course_question(p_question uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.courses;
begin
  c := public.question_course(p_question);
  update public.course_questions set is_active = false where id = p_question;
  update public.courses set updated_at = now() where id = c.id;
end $$;

create or replace function public.publish_course(p_course uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.courses; n int;
begin
  c := public.course_or_fail(p_course);
  if not public.can_manage_courses(c.organization_id, c.process_id) then
    raise exception 'No puedes publicar este curso' using errcode = '42501';
  end if;
  if c.status <> 'borrador' then
    raise exception 'El curso ya no está en borrador' using errcode = '22023';
  end if;
  select count(*) into n from public.course_questions where course_id = c.id and is_active;
  if n = 0 then
    raise exception 'Agrega al menos una pregunta antes de publicar' using errcode = '22023';
  end if;
  update public.courses set status = 'publicado', updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, 'publicar_curso', 'Capacitacion', c.id, c.code, '{}');
end $$;

create or replace function public.set_course_archived(p_course uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.courses;
begin
  c := public.course_or_fail(p_course);
  if not public.can_manage_courses(c.organization_id, c.process_id) then
    raise exception 'No puedes archivar este curso' using errcode = '42501';
  end if;
  update public.courses set status = case when p_archived then 'archivado' else 'borrador' end, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'estado_curso', 'Capacitacion', c.id, c.code, jsonb_build_object('archivado', p_archived));
end $$;

revoke execute on function public.course_or_fail, public.question_course, public.valid_question_options from public, anon, authenticated;
revoke execute on function public.create_course, public.update_course_data, public.add_course_question, public.update_course_question,
  public.remove_course_question, public.publish_course, public.set_course_archived from public, anon;
grant execute on function public.create_course, public.update_course_data, public.add_course_question, public.update_course_question,
  public.remove_course_question, public.publish_course, public.set_course_archived to authenticated;

-- ---------------------------------------------------------------------------
-- Tomar el curso (sin la respuesta correcta) y calificar en el servidor
-- ---------------------------------------------------------------------------

create or replace function public.get_course_to_take(p_org uuid, p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.courses; v_questions jsonb;
begin
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso' using errcode = 'P0002';
  end if;
  select * into c from public.courses where organization_id = p_org and code = p_code;
  if c.id is null then
    raise exception 'Curso no disponible' using errcode = 'P0002';
  end if;
  if c.status <> 'publicado' then
    raise exception 'Este curso no está disponible para tomarse' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id, 'order', q.order_index, 'text', q.text,
           'options', (select jsonb_agg(o->>'text') from jsonb_array_elements(q.options) o)
         ) order by q.order_index), '[]'::jsonb)
    into v_questions
  from public.course_questions q
  where q.course_id = c.id and q.is_active;
  return jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'content', c.content,
    'passingScore', c.passing_score, 'questions', v_questions);
end $$;

create or replace function public.submit_course_attempt(p_course uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.courses; q record; v_total int := 0; v_correct int := 0; v_idx int; v_sel int; v_score numeric; v_status text;
begin
  select * into c from public.courses where id = p_course;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Curso no disponible' using errcode = 'P0002';
  end if;
  if c.status <> 'publicado' then
    raise exception 'Este curso no está disponible para tomarse' using errcode = '22023';
  end if;
  for q in select id, options from public.course_questions where course_id = c.id and is_active order by order_index loop
    v_total := v_total + 1;
    select pos - 1 into v_idx from (
      select row_number() over () pos, value from jsonb_array_elements(q.options)
    ) s where (s.value->>'correct')::boolean limit 1;
    v_sel := nullif(p_answers ->> q.id::text, '')::int;
    if v_sel is not null and v_sel = v_idx then v_correct := v_correct + 1; end if;
  end loop;
  if v_total = 0 then
    raise exception 'El curso no tiene preguntas' using errcode = '22023';
  end if;
  v_score := round(v_correct * 100.0 / v_total, 2);
  v_status := case when v_score >= c.passing_score then 'aprobado' else 'no_aprobado' end;
  insert into public.course_enrollments (organization_id, course_id, user_id, status, score, answers, completed_at)
  values (c.organization_id, c.id, auth.uid(), v_status, v_score, p_answers, now())
  on conflict (course_id, user_id) do update set
    status = excluded.status, score = excluded.score, answers = excluded.answers, completed_at = now();
  perform public.log_event(c.organization_id, 'tomar_curso', 'Capacitacion', c.id, c.code, jsonb_build_object('estado', v_status));
  return jsonb_build_object('score', v_score, 'status', v_status, 'passingScore', c.passing_score);
end $$;

create or replace function public.get_course_by_code(p_org uuid, p_code text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_active_member(p_org) then raise exception 'Sin acceso' using errcode = 'P0002'; end if;
  select id into v_id from public.courses where organization_id = p_org and code = p_code;
  return v_id;
end $$;

revoke execute on function public.get_course_to_take, public.submit_course_attempt, public.get_course_by_code from public, anon;
grant execute on function public.get_course_to_take, public.submit_course_attempt, public.get_course_by_code to authenticated;
