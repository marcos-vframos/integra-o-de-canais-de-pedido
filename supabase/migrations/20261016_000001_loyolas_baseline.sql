-- Loyola's Lanches -> Supabase (PostgreSQL)
-- BASELINE ONLY: stage before importing real data. Do not run on unrelated databases.
-- Authenticated staff are scoped by tenant. Public visitors can only read published catalog/CMS.
-- NEVER expose service_role credentials in Vite/client browser.
create extension if not exists pgcrypto;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','TRIAL','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','cashier','kitchen','courier')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);
create index tenant_memberships_user_idx on public.tenant_memberships(user_id,tenant_id);

-- SECURITY DEFINER avoids recursive membership RLS. Does NOT grant admin privileges to anon.
create or replace function public.is_tenant_staff(_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = _tenant_id
      and m.user_id = (select auth.uid())
      and m.active
  );
$$;
revoke all on function public.is_tenant_staff(uuid) from public, anon;
grant execute on function public.is_tenant_staff(uuid) to authenticated;

create or replace function public.is_tenant_editor(_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = _tenant_id
      and m.user_id = (select auth.uid())
      and m.active
      and m.role in ('owner','manager')
  );
$$;
revoke all on function public.is_tenant_editor(uuid) from public, anon;
grant execute on function public.is_tenant_editor(uuid) to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);
create index categories_tenant_sort_idx on public.categories(tenant_id,sort_order);

create table public.menu (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  code text,
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  recipe jsonb not null default '[]'::jsonb,
  media_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);
create index menu_tenant_category_idx on public.menu(tenant_id,category,active);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  code text,
  name text not null,
  unit text not null,
  qty numeric(14,3) not null default 0,
  min_qty numeric(14,3) not null default 0,
  inventory_group text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id),
  unique (tenant_id,code)
);
create index inventory_tenant_group_idx on public.inventory(tenant_id,inventory_group);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  address text,
  notes text,
  last_order_at timestamptz,
  total_orders integer not null default 0,
  total_spent numeric(14,2) not null default 0,
  favorite_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id),
  unique (tenant_id,phone)
);
-- Legacy PocketBase 'passcode' MUST NOT be imported as plaintext.

create table public.motoboys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  name text not null,
  phone text,
  plate text,
  active boolean not null default true,
  fee_per_delivery numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);

create table public.delivery_fees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  name text not null,
  fee numeric(12,2) not null check (fee >= 0),
  lat numeric(11,7),
  lng numeric(11,7),
  area_geojson jsonb,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  ticket_number bigint not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  delivery_fee numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment text not null,
  payment_details jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  origin text not null default 'online',
  customer_id uuid references public.customers(id),
  customer_name text,
  customer_phone text,
  delivery_type text,
  customer_address text,
  delivery_lat numeric(11,7),
  delivery_lng numeric(11,7),
  motoboy_id uuid references public.motoboys(id),
  motoboy_name text,
  campaign_id uuid,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id),
  unique (tenant_id,idempotency_key)
);
create index orders_tenant_created_idx on public.orders(tenant_id,created_at desc);
create index orders_tenant_customer_idx on public.orders(tenant_id,customer_id);

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  opened_at timestamptz,
  closed_at timestamptz not null,
  date_label text not null,
  gross_total numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  net_total numeric(14,2) not null default 0,
  by_payment jsonb not null default '{}'::jsonb,
  orders_count integer not null default 0,
  product_breakdown jsonb not null default '{}'::jsonb,
  by_origin_count jsonb not null default '{}'::jsonb,
  by_origin_totals jsonb not null default '{}'::jsonb,
  shopping_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);
create index closures_tenant_closed_idx on public.closures(tenant_id,closed_at desc);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  key text not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,key)
);

create table public.landing_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  section text not null,
  data jsonb not null default '{}'::jsonb,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,section)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  customer_id uuid references public.customers(id),
  customer_phone text,
  customer_name text,
  type text not null,
  title text not null,
  description text,
  discount_percent numeric(7,3) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  target_product_id uuid references public.menu(id),
  target_product_name text,
  active boolean not null default false,
  used boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id)
);
create index campaigns_tenant_status_idx on public.campaigns(tenant_id,active,expires_at);

create table public.seasonal_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legacy_id text,
  title text not null,
  badge text,
  description text,
  active boolean not null default false,
  start_date timestamptz,
  end_date timestamptz,
  cta_text text,
  cta_url text,
  palette jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  media_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,legacy_id),
  check (start_date is null or end_date is null or start_date <= end_date)
);
create index seasonal_tenant_active_idx on public.seasonal_campaigns(tenant_id,active,start_date,end_date);

-- Centralized updated_at handling for every table. Does not expose write permissions.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'tenants','categories','menu','inventory','customers','motoboys','delivery_fees',
    'orders','closures','settings','landing_content','campaigns','seasonal_campaigns'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_'||tbl,tbl);
  end loop;
end $$;

-- Default-deny RLS for all tenant-owned tables.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'tenants','tenant_memberships','categories','menu','inventory','customers','motoboys',
    'delivery_fees','orders','closures','settings','landing_content','campaigns','seasonal_campaigns'
  ] loop execute format('alter table public.%I enable row level security',tbl); end loop;
end $$;

create policy tenants_public_catalog_locator on public.tenants
 for select to anon,authenticated using (status in ('ACTIVE','TRIAL'));
create policy tenants_staff_see on public.tenants
 for select to authenticated using (public.is_tenant_staff(id));

create policy tenant_memberships_own on public.tenant_memberships
 for select to authenticated using (user_id = (select auth.uid()));
-- Membership provisioning is exclusively service-side/admin, never direct browser mutation.

-- Public storefront content is read-only. A public visitor may see items of any published
-- store; there is no exposure of customer, inventory, voucher or order data.
create policy categories_catalog_read on public.categories for select to anon,authenticated
 using (active and exists (select 1 from public.tenants t where t.id=tenant_id and t.status in ('ACTIVE','TRIAL')));
create policy menu_catalog_read on public.menu for select to anon,authenticated
 using (active and exists (select 1 from public.tenants t where t.id=tenant_id and t.status in ('ACTIVE','TRIAL')));
create policy landing_content_read on public.landing_content for select to anon,authenticated
 using (exists (select 1 from public.tenants t where t.id=tenant_id and t.status in ('ACTIVE','TRIAL')));
create policy seasonal_campaigns_read on public.seasonal_campaigns for select to anon,authenticated
 using (active and (start_date is null or start_date <= now()) and (end_date is null or end_date >= now())
   and exists (select 1 from public.tenants t where t.id=tenant_id and t.status in ('ACTIVE','TRIAL')));

-- Staff can READ their own tenant; only owner/manager can mutate config/catalog.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'categories','menu','inventory','customers','motoboys','delivery_fees',
    'orders','closures','settings','landing_content','campaigns','seasonal_campaigns'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_tenant_staff(tenant_id))',tbl||'_staff_read',tbl);
  end loop;
  foreach tbl in array array[
    'categories','menu','inventory','motoboys','delivery_fees',
    'settings','landing_content','campaigns','seasonal_campaigns'
  ] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_tenant_editor(tenant_id)) with check (public.is_tenant_editor(tenant_id))',tbl||'_editor_write',tbl);
  end loop;
end $$;

-- Deliberately NO direct browser INSERT policies on orders/closures/customers.
-- Final checkout, stock decrement, vouchers, customer registration, cashier closure:
-- implement via authenticated backend/Edge Functions + DB transaction and idempotency.
-- Do NOT reenable public writes to bypass authentication, even in a demo.
