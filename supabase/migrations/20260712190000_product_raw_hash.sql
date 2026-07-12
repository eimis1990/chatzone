-- Incremental catalog sync: store a hash of each product's raw inputs so the
-- next sync can skip AI enrichment + embedding for unchanged products. A full
-- ~2,600-product re-enrich exceeds the serverless time budget (504); with the
-- hash, unchanged rows only get their synced_at bumped.
alter table public.product_embeddings
  add column if not exists raw_hash text;
