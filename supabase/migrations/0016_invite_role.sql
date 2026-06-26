-- Role carried by an invite, so teammate invites can grant 'member' (vs the
-- 'admin' the owner-provisioning flow grants the first user of a new org).
-- Defaults to 'admin' to preserve the existing owner→client invite behavior.

alter table public.invites
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'member'));
