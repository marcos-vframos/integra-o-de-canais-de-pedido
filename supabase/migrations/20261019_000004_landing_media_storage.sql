-- Allow owner/manager uploads for legacy Landing media under <tenant>/landing/...
-- Existing /campaigns policy remains unchanged.
create policy loyolas_landing_media_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'loyolas-public-media'
  and (storage.foldername(name))[2] = 'landing'
  and exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.active and m.role in ('owner','manager')
  )
);
create policy loyolas_landing_media_staff_update
on storage.objects for update to authenticated
using (
  bucket_id = 'loyolas-public-media'
  and (storage.foldername(name))[2] = 'landing'
  and exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.active and m.role in ('owner','manager')
  )
)
with check (
  bucket_id = 'loyolas-public-media'
  and (storage.foldername(name))[2] = 'landing'
  and exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.active and m.role in ('owner','manager')
  )
);
create policy loyolas_landing_media_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'loyolas-public-media'
  and (storage.foldername(name))[2] = 'landing'
  and exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.active and m.role in ('owner','manager')
  )
);
