-- quick-actions joins the component library (core folder — welcome-screen
-- suggested-action buttons apply to every bot). Seed the default variant so
-- existing bots keep their buttons; 'pills' and 'list' stay opt-in.

insert into public.provider_components (provider, component_key, variant_id)
values ('core', 'quick-actions', 'default')
on conflict (provider, component_key, variant_id) do nothing;
