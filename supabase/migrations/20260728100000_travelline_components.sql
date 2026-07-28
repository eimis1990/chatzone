-- TravelLine provider folder: room offers render through the product-cards
-- component, so make its default variant available out of the box. More
-- variants stay opt-in from /owner/components like everywhere else.

insert into public.provider_components (provider, component_key, variant_id)
values ('travelline', 'product-cards', 'default')
on conflict (provider, component_key, variant_id) do nothing;
