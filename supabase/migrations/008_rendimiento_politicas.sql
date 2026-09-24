-- 008 · Rendimiento de RLS (linter 0003 y 0006), sin cambiar quién puede qué:
-- auth.uid() dentro de (select ...) se evalúa una vez por consulta, y las políticas
-- "for all" de los catálogos se separan para no duplicar la de select.

drop policy profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id) or public.is_platform_admin());
drop policy profile_update on public.profiles;
create policy profile_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy membership_select on public.memberships;
create policy membership_select on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_manage_org(organization_id)
    or public.has_role(organization_id, 'auditor')
  );

drop policy invitation_insert on public.invitations;
create policy invitation_insert on public.invitations for insert to authenticated
  with check (public.can_manage_org(organization_id) and invited_by = (select auth.uid()));

drop policy recert_insert on public.access_recertifications;
create policy recert_insert on public.access_recertifications for insert to authenticated
  with check (public.can_manage_org(organization_id) and reviewed_by = (select auth.uid()));

-- Catálogos: escritura por Admin o Líder SIG, separada por operación.
drop policy process_write on public.processes;
create policy process_insert on public.processes for insert to authenticated
  with check (public.can_manage_org(organization_id));
create policy process_update on public.processes for update to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy process_delete on public.processes for delete to authenticated
  using (public.can_manage_org(organization_id));

drop policy position_write on public.positions;
create policy position_insert on public.positions for insert to authenticated
  with check (public.can_manage_org(organization_id));
create policy position_update on public.positions for update to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy position_delete on public.positions for delete to authenticated
  using (public.can_manage_org(organization_id));

drop policy position_role_write on public.position_roles;
create policy position_role_insert on public.position_roles for insert to authenticated
  with check (public.can_manage_org(organization_id));
create policy position_role_update on public.position_roles for update to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy position_role_delete on public.position_roles for delete to authenticated
  using (public.can_manage_org(organization_id));

drop policy doctype_write on public.document_types;
create policy doctype_insert on public.document_types for insert to authenticated
  with check (public.can_manage_org(organization_id));
create policy doctype_update on public.document_types for update to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy doctype_delete on public.document_types for delete to authenticated
  using (public.can_manage_org(organization_id));
