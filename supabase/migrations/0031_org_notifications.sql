-- Per-org email-notification preferences (Settings → Notifications).
-- Keys default to ON when absent: { "leadEmails": bool, "handoffEmails": bool }.
alter table public.organizations
  add column if not exists notifications jsonb not null default '{}'::jsonb;
