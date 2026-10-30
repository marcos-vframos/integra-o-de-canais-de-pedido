begin;
do $$
declare tenant constant uuid:='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'; owner_id uuid;
 first_status jsonb; second_status jsonb; rejected boolean:=false; existing_order public.orders%rowtype;
begin
 assert (select started_at is null and expires_at is null from app_private.store_pilots where tenant_id=tenant), 'Pilot must remain unstarted';
 assert public.store_pilot_status(tenant)->>'state'='PREPARED';
 assert not has_function_privilege('anon','public.activate_store_pilot(uuid)','execute');
 assert not has_table_privilege('authenticated','app_private.store_pilots','select');
 select user_id into owner_id from public.tenant_memberships where tenant_id=tenant and role='owner' and active limit 1;
 assert owner_id is not null;
 -- Security is tested by the same auth.uid() used by the production RPC.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 begin perform public.activate_store_pilot(tenant);
 exception when others then rejected:=position('somente o proprietário' in sqlerrm)>0; end;
 assert rejected,'Non-owner must not activate';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 first_status:=public.activate_store_pilot(tenant);
 assert first_status->>'mode'='READY';
 assert first_status->>'state'='RUNNING';
 assert first_status->>'integrationTest'='false';
 assert (first_status->>'expiresAt')::timestamptz - (first_status->>'startedAt')::timestamptz=interval '168 hours';
 second_status:=public.activate_store_pilot(tenant);
 assert second_status->>'expiresAt'=first_status->>'expiresAt','Second click must not extend';
 assert (select value='false' from public.settings where tenant_id=tenant and key='integration_test_mode');
 -- Fast-forward only inside this rolled-back transaction.
 update app_private.store_pilots set started_at=statement_timestamp()-interval '169 hours',expires_at=statement_timestamp()-interval '1 hour' where tenant_id=tenant;
 assert public.store_pilot_status(tenant)->>'state'='EXPIRED';
 assert public.store_pilot_status(tenant)->>'acceptsOrders'='false';
 select * into existing_order from public.orders where tenant_id=tenant limit 1;
 assert existing_order.id is not null,'A known pre-existing test order is required for rollback-only insert probe';
 existing_order.id:=gen_random_uuid();
 existing_order.idempotency_key:='ord-pilot-expired-rollback-'||gen_random_uuid()::text;
 rejected:=false;
 begin insert into public.orders select existing_order.*;
 exception when others then rejected:=position('piloto encerrado' in sqlerrm)>0; end;
 assert rejected,'Expired pilot must block inserts without relying on cron';
 assert app_private.expire_store_pilots()=1;
 assert (select status='SUSPENDED' from public.tenants where id=tenant);
 assert app_private.expire_store_pilots()=0,'Expiry must be idempotent';
 rejected:=false;
 begin perform public.activate_store_pilot(tenant);
 exception when others then rejected:=position('não pode ser reiniciado' in sqlerrm)>0; end;
 assert rejected,'Expired pilot must not restart';
end; $$;
rollback;
select 'PASS: owner authorization, READY, exact 168 hours, repeat-click idempotency, expiry, insert rejection, cron, restart rejection; all changes rolled back' as result;