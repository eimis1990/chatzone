-- Room visualizer add-on (€29/mo, 100 renders/month included).
-- Mirrors the voice add-on: a boolean mirrored from the Stripe subscription,
-- plus a monthly render pool tracked per org.

alter table public.organizations
  add column visualizer_addon boolean not null default false;

-- One row per org per calendar month (month = first day). Written only by the
-- service role from /api/widget/visualize; org members may read their own
-- usage for the dashboard.
create table public.visualizer_usage (
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null,
  renders integer not null default 0,
  primary key (org_id, month)
);

alter table public.visualizer_usage enable row level security;

create policy "members read own visualizer usage"
  on public.visualizer_usage for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = visualizer_usage.org_id and m.user_id = auth.uid()
    )
  );

-- Atomic pool consumption: bump this month's counter and return the new total,
-- so concurrent renders can't double-spend a read-then-write.
create or replace function public.increment_visualizer_usage(p_org_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.visualizer_usage (org_id, month, renders)
  values (p_org_id, date_trunc('month', now())::date, 1)
  on conflict (org_id, month)
  do update set renders = visualizer_usage.renders + 1
  returning renders;
$$;

revoke all on function public.increment_visualizer_usage(uuid) from public, anon, authenticated;
