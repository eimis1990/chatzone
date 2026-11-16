-- Backward-compatible foundation. Existing Free accounts keep their current
-- access until a notice has been shown and its 30-day period has elapsed.
alter table public.organizations drop constraint organizations_plan_check;
alter table public.organizations add constraint organizations_plan_check
  check (plan in ('free', 'basic', 'starter', 'growth', 'scale', 'enterprise'));
alter table public.organizations
  add column free_policy_paused boolean not null default false,
  add column free_legacy boolean not null default false,
  add column free_policy_effective_at timestamptz;
update public.organizations set free_legacy = true where plan = 'free';

-- Going paid permanently leaves the legacy-Free cohort; subsequent cancellation
-- must not restore an old trial's privileges.
create function public.leave_legacy_free_policy() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.plan <> 'free' then
    new.free_legacy := false;
    new.free_policy_paused := false;
    new.free_policy_effective_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.leave_legacy_free_policy() from public, anon, authenticated;
create trigger organizations_leave_legacy_free_policy
  before update of plan on public.organizations
  for each row execute function public.leave_legacy_free_policy();
