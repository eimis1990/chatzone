-- Independent folder for the opt-in legacy catalogue provider. Do not copy
-- WooCommerce order-status assignments: this provider supports catalogue reads only.
insert into public.provider_components (provider, component_key, variant_id)
values ('woocommerce_legacy', 'product-cards', 'default')
on conflict (provider, component_key, variant_id) do nothing;
