-- Compliance (Phase 1 / #7a): per-org conversation retention window.
-- null = keep forever; otherwise the retention cron purges conversations
-- (and their messages, via cascade) older than `retention_days`.
alter table public.organizations
  add column if not exists retention_days int
  check (retention_days is null or retention_days between 1 and 3650);
