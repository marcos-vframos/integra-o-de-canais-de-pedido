-- Staging preview must be able to resolve the single DRAFT tenant from RLS.
-- The tenant record reveals only its identity and public-facing display name; it does
-- NOT grant permissions for customers/orders/auth/member tables.
create policy loyolas_preview_tenant_locator on public.tenants
  for select to anon, authenticated
  using (id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and status='DRAFT');
