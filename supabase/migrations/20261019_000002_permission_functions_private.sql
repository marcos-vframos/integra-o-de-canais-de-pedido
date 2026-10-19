-- Keep SECURITY DEFINER membership checks out of Supabase REST-exposed public schema.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

alter function public.is_tenant_staff(uuid) set schema app_private;
alter function public.is_tenant_editor(uuid) set schema app_private;

-- Policy references remain bound by function OID after relocation.
-- The functions only check membership of auth.uid(), never make writes.
revoke all on function app_private.is_tenant_staff(uuid) from public, anon;
revoke all on function app_private.is_tenant_editor(uuid) from public, anon;
grant execute on function app_private.is_tenant_staff(uuid) to authenticated;
grant execute on function app_private.is_tenant_editor(uuid) to authenticated;
