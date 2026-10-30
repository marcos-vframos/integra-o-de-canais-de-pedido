
-- Prepared pilots have no start/end date until an authenticated owner activates.
create table if not exists app_private.store_pilots (
 tenant_id uuid primary key references public.tenants(id),
 started_at timestamptz, expires_at timestamptz,
 activated_by uuid references auth.users(id), ended_at timestamptz,
 constraint pilot_complete_window check (
  (started_at is null and expires_at is null and activated_by is null and ended_at is null)
  or (started_at is not null and expires_at = started_at + interval '168 hours' and activated_by is not null
      and (ended_at is null or ended_at >= expires_at))
 )
);
alter table app_private.store_pilots enable row level security;
revoke all on app_private.store_pilots from public,anon,authenticated;
insert into app_private.store_pilots(tenant_id)
select id from public.tenants where id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'
on conflict do nothing;

create or replace function app_private.pilot_public_status(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_p app_private.store_pilots%rowtype; v_t public.tenants%rowtype;
 v_now timestamptz:=clock_timestamp(); v_expired boolean; v_running boolean; v_test boolean;
begin
 select * into v_t from public.tenants where id=p_tenant;
 if not found then return jsonb_build_object('managed',false,'state','UNAVAILABLE','acceptsOrders',false,'integrationTest',true,'serverNow',v_now); end if;
 select * into v_p from app_private.store_pilots where tenant_id=p_tenant;
 v_expired:=v_p.expires_at is not null and v_p.expires_at<=v_now;
 v_running:=v_p.started_at is not null and not v_expired and v_t.status='ACTIVE';
 select coalesce((select value='true' from public.settings where tenant_id=p_tenant and key='integration_test_mode'),false) into v_test;
 return jsonb_build_object('managed',v_p.tenant_id is not null,
  'state',case when v_expired then 'EXPIRED' when v_running then 'RUNNING' when v_p.started_at is null and v_p.tenant_id is not null then 'PREPARED' else 'UNAVAILABLE' end,
  'mode',case when v_expired then 'OFFLINE' when v_running then 'READY' else v_t.status end,
  'startedAt',v_p.started_at,'expiresAt',v_p.expires_at,'serverNow',v_now,
  'acceptsOrders',not v_expired and v_t.status in ('ACTIVE','TRIAL'),
  'integrationTest',case when v_running then false else v_test end);
end; $$;
revoke all on function app_private.pilot_public_status(uuid) from public;
grant execute on function app_private.pilot_public_status(uuid) to anon,authenticated,service_role;
create or replace function public.store_pilot_status(p_tenant uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.pilot_public_status(p_tenant);
$$;
revoke all on function public.store_pilot_status(uuid) from public;
grant execute on function public.store_pilot_status(uuid) to anon,authenticated,service_role;

create or replace function app_private.activate_store_pilot(p_tenant uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_p app_private.store_pilots%rowtype; v_status text; v_start timestamptz;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_memberships
  where tenant_id=p_tenant and user_id=auth.uid() and active and role='owner') then
  raise exception 'Acesso: somente o proprietário pode ativar os sete dias';
 end if;
 select status into v_status from public.tenants where id=p_tenant for update;
 select * into v_p from app_private.store_pilots where tenant_id=p_tenant for update;
 if not found then raise exception 'Loja sem piloto preparado'; end if;
 if v_p.started_at is not null then
  if v_p.expires_at<=clock_timestamp() then raise exception 'Loja com piloto encerrado. O prazo não pode ser reiniciado.'; end if;
  return app_private.pilot_public_status(p_tenant);
 end if;
 if v_status not in ('TRIAL','DRAFT') then raise exception 'Loja não está disponível para ativação do piloto'; end if;
 v_start:=clock_timestamp();
 update app_private.store_pilots set started_at=v_start,expires_at=v_start+interval '168 hours',activated_by=auth.uid() where tenant_id=p_tenant;
 update public.tenants set status='ACTIVE',updated_at=v_start where id=p_tenant;
 insert into public.settings(tenant_id,key,value) values(p_tenant,'integration_test_mode','false')
 on conflict(tenant_id,key) do update set value='false',updated_at=v_start;
 return app_private.pilot_public_status(p_tenant);
end; $$;
revoke all on function app_private.activate_store_pilot(uuid) from public,anon;
grant execute on function app_private.activate_store_pilot(uuid) to authenticated;
create or replace function public.activate_store_pilot(p_tenant uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.activate_store_pilot(p_tenant);
$$;
revoke all on function public.activate_store_pilot(uuid) from public,anon;
grant execute on function public.activate_store_pilot(uuid) to authenticated;

create or replace function app_private.guard_pilot_order()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from app_private.store_pilots where tenant_id=new.tenant_id and expires_at<=clock_timestamp()) then
  raise exception 'Loja com piloto encerrado após sete dias. Novos pedidos bloqueados.';
 end if;
 return new;
end; $$;
revoke all on function app_private.guard_pilot_order() from public,anon,authenticated;
create trigger guard_store_pilot_order before insert on public.orders
 for each row execute function app_private.guard_pilot_order();

create or replace function app_private.expire_store_pilots()
returns integer language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_count integer:=0;
begin
 for v_id in select tenant_id from app_private.store_pilots where expires_at<=clock_timestamp() and ended_at is null
 loop
  perform 1 from public.tenants where id=v_id for update;
  update app_private.store_pilots set ended_at=clock_timestamp()
   where tenant_id=v_id and expires_at<=clock_timestamp() and ended_at is null;
  if found then
   update public.tenants set status='SUSPENDED',updated_at=clock_timestamp()
    where id=v_id and status in ('ACTIVE','TRIAL');
   v_count:=v_count+1;
  end if;
 end loop;
 return v_count;
end; $$;
revoke all on function app_private.expire_store_pilots() from public,anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('loyolas-expire-seven-day-pilots','* * * * *','select app_private.expire_store_pilots()');
