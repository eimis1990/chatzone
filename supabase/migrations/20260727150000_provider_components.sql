-- Widget component library: which components are AVAILABLE per commerce
-- provider (plus 'core' for provider-independent ones). The component/variant
-- catalog itself lives in code (lib/widget-components/meta.ts); this table only
-- holds assignments. Bots pick a variant via config.components[key].
-- Enforcement layers on top of code capabilities — folders can only narrow.

create table public.provider_components (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  component_key text not null,
  created_at timestamptz not null default now(),
  unique (provider, component_key)
);

alter table public.provider_components enable row level security;

-- Owner-only, like the prompt library. Runtime reads use the service client.
create policy provider_components_owner_all on public.provider_components
  for all using (public.is_owner()) with check (public.is_owner());

-- Backfill today's implicit reality so nothing turns off for existing bots:
-- product cards everywhere, order status where code supports it (woo+magento),
-- provider-independent components under 'core'.
insert into public.provider_components (provider, component_key) values
  ('woocommerce', 'product-cards'),
  ('shopify',     'product-cards'),
  ('magento',     'product-cards'),
  ('verskis',     'product-cards'),
  ('feed',        'product-cards'),
  ('woocommerce', 'order-status'),
  ('magento',     'order-status'),
  ('core',        'lead-form'),
  ('core',        'room-visualizer');
