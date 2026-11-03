-- Dispatch order notifications after commit; the minute worker remains the recovery path.
create function app_private.wa_dispatch_order_queue() returns trigger
language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if new.kind<>'order' then return new;end if;
 select worker_secret into secret from app_private.wa_connections where tenant_id=new.tenant_id and enabled;
 if secret is not null then
  perform net.http_post(url:='https://awgqpfdfsyslpqpfzoul.supabase.co/functions/v1/customer-whatsapp',
   headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',secret),
   body:=jsonb_build_object('tenantId',new.tenant_id,'action','dispatch'));
 end if;
 return new;
exception when others then
 -- Keep the durable queue entry even if immediate dispatch cannot be scheduled.
 return new;
end $$;
revoke all on function app_private.wa_dispatch_order_queue() from public,anon,authenticated;
create trigger wa_immediate_order_dispatch after insert on app_private.wa_outbox for each row execute function app_private.wa_dispatch_order_queue();
