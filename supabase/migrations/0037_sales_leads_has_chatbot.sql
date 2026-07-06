-- ---------------------------------------------------------------------------
-- Sales leads: existing-chatbot signal (feeds the ranking)
-- ---------------------------------------------------------------------------
-- Whether the prospect already runs a chatbot on their site. A missing chatbot
-- makes them an easier win (no sunk cost / incumbent), so this raises their
-- score; an existing one (incl. a competitor's) lowers it. null = unknown.
alter table public.sales_leads
  add column if not exists has_chatbot boolean;
