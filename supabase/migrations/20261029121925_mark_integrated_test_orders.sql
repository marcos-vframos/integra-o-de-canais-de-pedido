-- Test marking is opt-in per tenant; ordinary SaaS TRIAL tenants are unaffected.
create or replace function app_private.mark_integrated_test_order()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.tenants t join public.settings s
   on s.tenant_id=t.id and s.key='integration_test_mode' and s.value='true'
   where t.id=new.tenant_id and t.status='TRIAL') then
  new.payment_details:=coalesce(new.payment_details,'{}'::jsonb)||jsonb_build_object('integrationTest',true);
  new.customer_name:='[TESTE] '||left(coalesce(new.customer_name,''),112);
 else
  new.payment_details:=coalesce(new.payment_details,'{}'::jsonb)-'integrationTest';
 end if;
 return new;
end; $$;
revoke all on function app_private.mark_integrated_test_order() from public,anon,authenticated;
create trigger mark_integrated_test_order before insert on public.orders
for each row execute function app_private.mark_integrated_test_order();
