-- Knowledge-base file storage bucket (private; read via service role at ingest time)
insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

-- Authenticated users (client portal) may upload, list, and remove files in the
-- knowledge bucket. Objects are addressed by bot/source path; the bucket is
-- private so nothing is publicly enumerable. Ingestion reads via service role.
create policy knowledge_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'knowledge');
create policy knowledge_auth_select on storage.objects
  for select to authenticated using (bucket_id = 'knowledge');
create policy knowledge_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'knowledge');
