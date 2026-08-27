-- Messenger channel add-on entitlement (€19/mo). Doubles as the gate for who
-- may reach the connect flow while the Meta app is still unpublished: internal
-- orgs and the Meta App Review test org get it set true, everyone else keeps
-- seeing "Coming soon" until the app is published and billing is wired.
alter table public.organizations
  add column if not exists messenger_addon boolean not null default false;
