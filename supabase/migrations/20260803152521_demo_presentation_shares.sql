-- Revocable, short-lived public links for owner-created demo presentations.
-- The raw bearer token is returned once to the owner and never persisted; only
-- its SHA-256 digest is stored. Public reads still go through a tightly scoped
-- service-role server page, so this table has no anonymous policy.

create table public.demo_presentation_shares (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references public.bots(id) on delete cascade,
  token_hash  text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  constraint demo_presentation_shares_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint demo_presentation_shares_expiry_check
    check (expires_at > created_at)
);

create index demo_presentation_shares_active_bot_idx
  on public.demo_presentation_shares (bot_id, expires_at desc)
  where revoked_at is null;

alter table public.demo_presentation_shares enable row level security;

-- Service-only table: neither browser role can inspect the token digests. Both
-- owner generation and public resolution go through explicitly authorized,
-- server-only code using the service role.
revoke all on public.demo_presentation_shares from anon, authenticated;
grant select, insert, update, delete on public.demo_presentation_shares to service_role;
