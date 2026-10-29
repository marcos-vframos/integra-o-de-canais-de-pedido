-- Internal recovery copy for explicitly requested resets. Never exposed to the app.
create table app_private.test_reset_archives(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 created_at timestamptz not null default clock_timestamp(),
 reason text not null,payload jsonb not null
);
alter table app_private.test_reset_archives enable row level security;
revoke all on app_private.test_reset_archives from public,anon,authenticated;
