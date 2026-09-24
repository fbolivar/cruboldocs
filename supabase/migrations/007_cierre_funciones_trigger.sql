-- 007 · Funciones de trigger fuera de la API: Supabase concede EXECUTE por defecto
-- a anon/authenticated y las expone en /rest/v1/rpc (aviso del linter 0028/0029).

revoke execute on function public.handle_new_user, public.touch_updated_at,
  public.set_assessment_level, public.forbid_change,
  public.guard_version_immutable, public.guard_signature from public, anon, authenticated;
