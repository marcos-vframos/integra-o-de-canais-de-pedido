-- Campaign assets for public landing and online store. Keep account data out of this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loyolas-public-media', 'loyolas-public-media', true, 15728640,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf']::text[]
)
on conflict (id) do nothing;

-- Store files under <tenant UUID>/campaigns/<filename>. Only authenticated owners/managers
-- of the tenant matching the FIRST path segment may upload/edit/delete media.
create policy loyolas_media_staff_insert
on storage.objects for insert to authenticated with check (
  bucket_id='loyolas-public-media'
  and (storage.foldername(name))[2] = 'campaigns'
  and exists(
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id=(select auth.uid()) and m.active and m.role in('owner','manager')
  )
);
create policy loyolas_media_staff_update
on storage.objects for update to authenticated using (
  bucket_id='loyolas-public-media'
  and (storage.foldername(name))[2] = 'campaigns'
  and exists(
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id=(select auth.uid()) and m.active and m.role in('owner','manager')
  )
) with check (
  bucket_id='loyolas-public-media'
  and (storage.foldername(name))[2] = 'campaigns'
  and exists(
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id=(select auth.uid()) and m.active and m.role in('owner','manager')
  )
);
create policy loyolas_media_staff_delete
on storage.objects for delete to authenticated using (
  bucket_id='loyolas-public-media'
  and (storage.foldername(name))[2] = 'campaigns'
  and exists(
    select 1 from public.tenant_memberships m
    where m.tenant_id::text = (storage.foldername(name))[1]
      and m.user_id=(select auth.uid()) and m.active and m.role in('owner','manager')
  )
);
