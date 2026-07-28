-- Variant-level folder assignment: a provider folder now holds specific
-- VARIANTS (one row per provider + component + variant). Only assigned
-- variants are selectable on a bot's Components page; widget-config sanitizes
-- any stale bot choice back to the first assigned variant.

alter table public.provider_components
  add column variant_id text not null default 'default';

alter table public.provider_components
  drop constraint provider_components_provider_component_key_key;

alter table public.provider_components
  add constraint provider_components_provider_component_variant_key
  unique (provider, component_key, variant_id);

-- Existing rows became the 'default' variant via the column default — exactly
-- what every bot renders today. Additional variants (e.g. product-cards
-- 'compact') are opt-in per folder from /owner/components.
