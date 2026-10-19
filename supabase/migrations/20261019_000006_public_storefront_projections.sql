-- Public storefront reads are an allowlisted replica of private inventory/settings.
-- For DRAFT tenants, visitors see nothing. Only ACTIVE/TRIAL become public.
create table if not exists public.storefront_settings(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  unique(tenant_id,key)
);
create table if not exists public.catalog_inventory(
  id uuid primary key references public.inventory(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text, name text not null, unit text not null,
  qty numeric(14,3) not null default 0,
  min_qty numeric(14,3) not null default 0,
  inventory_group text not null default 'Ingrediente',
  updated_at timestamptz not null default now()
);
create index if not exists catalog_inventory_tenant_idx on public.catalog_inventory(tenant_id,code);
alter table public.storefront_settings enable row level security;
alter table public.catalog_inventory enable row level security;

create policy storefront_settings_public_read on public.storefront_settings
 for select to anon,authenticated using (
 exists(select 1 from public.tenants t where t.id=tenant_id and t.status in('ACTIVE','TRIAL'))
 );
create policy storefront_settings_staff_read on public.storefront_settings
 for select to authenticated using(app_private.is_tenant_staff(tenant_id));

create policy catalog_inventory_public_read on public.catalog_inventory
 for select to anon,authenticated using (
 exists(select 1 from public.tenants t where t.id=tenant_id and t.status in('ACTIVE','TRIAL'))
 );
create policy catalog_inventory_staff_read on public.catalog_inventory
 for select to authenticated using(app_private.is_tenant_staff(tenant_id));
create policy delivery_fees_public_read on public.delivery_fees
 for select to anon,authenticated using (
 active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status in('ACTIVE','TRIAL'))
 );

create or replace function app_private.sync_storefront_setting()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='DELETE' then
   delete from public.storefront_settings where tenant_id=old.tenant_id and key=old.key;
   return old;
 end if;
 if new.key in ('store_name','is_open','force_open','force_closed','pix_key') then
   insert into public.storefront_settings(tenant_id,key,value,updated_at)
   values(new.tenant_id,new.key,new.value,now())
   on conflict(tenant_id,key) do update set value=excluded.value,updated_at=now();
 elsif tg_op='UPDATE' then
   delete from public.storefront_settings where tenant_id=old.tenant_id and key=old.key;
 end if;
 return new;
end $$;
revoke all on function app_private.sync_storefront_setting() from public,anon,authenticated;
drop trigger if exists sync_storefront_settings on public.settings;
create trigger sync_storefront_settings after insert or update or delete on public.settings
 for each row execute function app_private.sync_storefront_setting();

create or replace function app_private.sync_catalog_inventory()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='DELETE' then
   delete from public.catalog_inventory where id=old.id;
   return old;
 end if;
 insert into public.catalog_inventory(id,tenant_id,code,name,unit,qty,min_qty,inventory_group,updated_at)
 values(new.id,new.tenant_id,new.code,new.name,new.unit,
   case when new.qty>0 then 1000 else 0 end,0,new.inventory_group,now())
 on conflict(id) do update set
  code=excluded.code,name=excluded.name,unit=excluded.unit,
  qty=excluded.qty,inventory_group=excluded.inventory_group,updated_at=now();
 return new;
end $$;
revoke all on function app_private.sync_catalog_inventory() from public,anon,authenticated;
drop trigger if exists sync_catalog_inventory on public.inventory;
create trigger sync_catalog_inventory after insert or update or delete on public.inventory
 for each row execute function app_private.sync_catalog_inventory();

insert into public.storefront_settings(tenant_id,key,value)
 select tenant_id,key,value from public.settings
 where key in('store_name','is_open','force_open','force_closed','pix_key')
on conflict(tenant_id,key) do update set value=excluded.value;
insert into public.catalog_inventory(id,tenant_id,code,name,unit,qty,min_qty,inventory_group)
 select id,tenant_id,code,name,unit,case when qty>0 then 1000 else 0 end,0,inventory_group
 from public.inventory
on conflict(id) do update set qty=excluded.qty,name=excluded.name,code=excluded.code;
