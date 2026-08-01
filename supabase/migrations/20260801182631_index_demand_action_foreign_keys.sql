-- Cover non-cascade foreign-key lookups used when a profile or plan is removed.
create index demand_action_plans_created_by_idx
  on public.demand_action_plans(created_by)
  where created_by is not null;

create index product_search_synonyms_action_plan_idx
  on public.product_search_synonyms(action_plan_id)
  where action_plan_id is not null;

create index product_search_synonyms_created_by_idx
  on public.product_search_synonyms(created_by)
  where created_by is not null;
