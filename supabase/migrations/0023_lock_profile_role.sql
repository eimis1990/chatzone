-- Prevent privilege escalation via the profiles table.
--
-- The `profiles_update_self` RLS policy (0002_rls.sql) is row-level only, so an
-- authenticated client could PATCH their own `profiles.role` to 'owner' via
-- PostgREST (with the public anon key + their JWT) and gain platform-owner
-- access through is_owner(). RLS/WITH CHECK cannot express "this column may not
-- change", so enforce column immutability with a trigger.
--
-- An authenticated NON-owner can never change a profile's role: the trigger
-- resets it to the previous value. The platform owner (is_owner()) may still
-- change roles, and non-JWT paths (auth.uid() IS NULL — service role, SQL
-- editor, seeding, the initial owner grant) are unaffected.

create or replace function public.lock_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_owner() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role
  before update on public.profiles
  for each row
  execute function public.lock_profile_role();
