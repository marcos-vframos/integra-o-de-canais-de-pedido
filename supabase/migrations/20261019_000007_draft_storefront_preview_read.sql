-- Temporary, explicitly scoped public showcase access for staging only.
-- Exposes intended storefront content of Loyola's DRAFT tenant in preview URLs.
-- NEVER allow anonymous access to private inventory, customers, orders or staff.
-- Remove these policies after go-live and use ordinary ACTIVE/TRIAL storefront rules.
create policy loyolas_preview_menu_read on public.menu
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and active
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
create policy loyolas_preview_categories_read on public.categories
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and active
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
create policy loyolas_preview_landing_read on public.landing_content
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
create policy loyolas_preview_campaigns_read on public.seasonal_campaigns
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and active
  and (start_date is null or start_date <= now())
  and (end_date is null or end_date >= now())
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
create policy loyolas_preview_store_settings_read on public.storefront_settings
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid
  and key in ('store_name','is_open','force_open','force_closed')
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
create policy loyolas_preview_catalog_inventory_read on public.catalog_inventory
 for select to anon, authenticated
 using (tenant_id = '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid
  and exists (select 1 from public.tenants t where t.id=tenant_id and t.status='DRAFT'));
-- NOTE: The sanitized catalog_inventory table replaces real quantities with 1000/0.
-- This is exclusively for public customer customization and not usable for stock management.
