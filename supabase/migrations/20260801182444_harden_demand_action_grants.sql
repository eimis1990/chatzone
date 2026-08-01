-- Supabase projects can still carry legacy default privileges even when new
-- table auto-exposure is disabled. Remove every inherited table privilege and
-- grant only the four operations used by the application.

revoke all on table public.demand_action_plans from anon, authenticated, service_role;
revoke all on table public.product_search_synonyms from anon, authenticated, service_role;

grant select, insert, update, delete on table public.demand_action_plans to authenticated;
grant select, insert, update, delete on table public.product_search_synonyms to authenticated;
grant select, insert, update, delete on table public.demand_action_plans to service_role;
grant select, insert, update, delete on table public.product_search_synonyms to service_role;

-- A single permissive policy avoids evaluating two overlapping policies for
-- owners who also belong to the bot organization.
drop policy demand_action_plans_owner_all on public.demand_action_plans;
drop policy demand_action_plans_member_rw on public.demand_action_plans;
create policy demand_action_plans_authenticated_rw on public.demand_action_plans
  for all to authenticated
  using (
    public.is_owner()
    or public.bot_org_id(bot_id) in (select public.auth_org_ids())
  )
  with check (
    public.is_owner()
    or public.bot_org_id(bot_id) in (select public.auth_org_ids())
  );

drop policy product_search_synonyms_owner_all on public.product_search_synonyms;
drop policy product_search_synonyms_member_rw on public.product_search_synonyms;
create policy product_search_synonyms_authenticated_rw on public.product_search_synonyms
  for all to authenticated
  using (
    public.is_owner()
    or public.bot_org_id(bot_id) in (select public.auth_org_ids())
  )
  with check (
    public.is_owner()
    or public.bot_org_id(bot_id) in (select public.auth_org_ids())
  );
