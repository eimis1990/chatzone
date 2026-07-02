-- The Get Started dialog now asks for a company name (required) — it becomes
-- the client organization's name when the owner sends an invitation.
alter table public.signups
  add column if not exists company text;
