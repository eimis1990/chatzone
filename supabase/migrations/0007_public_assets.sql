-- Public bucket for client-uploaded logos/avatars (served to widget visitors).
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Anyone may read (public bucket); authenticated users (client portal) may
-- upload/replace/remove. The bucket is public-read by design (logos shown in
-- the embedded widget on third-party sites).
create policy public_assets_read on storage.objects
  for select using (bucket_id = 'public-assets');
create policy public_assets_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'public-assets');
create policy public_assets_update on storage.objects
  for update to authenticated using (bucket_id = 'public-assets');
create policy public_assets_delete on storage.objects
  for delete to authenticated using (bucket_id = 'public-assets');
