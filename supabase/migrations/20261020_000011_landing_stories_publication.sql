create table public.landing_stories (
id uuid primary key default gen_random_uuid(),
tenant_id uuid not null references public.tenants(id),
caption text not null default '',
link_url text not null default '',
link_label text not null default '',
media_url text not null,
media_kind text not null check (media_kind in ('image','video')),
active boolean not null default false,
starts_at timestamptz,
sort_order integer not null default 0,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
check (not active or starts_at is not null)
);
create index landing_stories_tenant_order_idx on public.landing_stories(tenant_id,sort_order,created_at);
alter table public.landing_stories enable row level security;
grant select on public.landing_stories to anon;
grant select,insert,update,delete on public.landing_stories to authenticated;
create policy stories_editor on public.landing_stories for all to authenticated using (app_private.is_tenant_editor(tenant_id)) with check (app_private.is_tenant_editor(tenant_id));
create policy stories_public on public.landing_stories for select to anon,authenticated using (
active and starts_at <= now() and starts_at + interval '24 hours' > now()
and exists(select 1 from public.tenants t where t.id=tenant_id and (t.status in ('ACTIVE','TRIAL') or (t.id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6' and t.status='DRAFT')))
);
