-- Voice add-on flag on the organization. The add-on is an extra item on the
-- org's Stripe subscription (not a separate subscription); the webhook flips
-- this based on whether the voice price is present among the subscription items.

alter table public.organizations
  add column if not exists voice_addon boolean not null default false;
