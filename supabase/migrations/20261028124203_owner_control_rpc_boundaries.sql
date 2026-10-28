-- Privileged implementations are private. Public RPC wrappers execute as caller.
alter function public.save_control_record(uuid,uuid,text,jsonb,integer) set schema app_private;
alter function public.control_source_key(uuid,text) set schema app_private;
create function public.save_control_record(p_tenant uuid,p_id uuid,p_kind text,p_data jsonb,p_expected_revision integer)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.save_control_record(p_tenant,p_id,p_kind,p_data,p_expected_revision);
$$;
create function public.control_source_key(p_tenant uuid,p_key_id text)
returns text language sql security invoker set search_path='' as $$
 select app_private.control_source_key(p_tenant,p_key_id);
$$;
revoke all on function public.save_control_record(uuid,uuid,text,jsonb,integer) from public,anon;
revoke all on function public.control_source_key(uuid,text) from public,anon;
grant execute on function public.save_control_record(uuid,uuid,text,jsonb,integer) to authenticated;
grant execute on function public.control_source_key(uuid,text) to authenticated;
create policy control_source_keys_no_direct_access on app_private.control_source_keys as restrictive for all to authenticated using(false) with check(false);
