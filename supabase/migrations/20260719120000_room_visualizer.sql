-- Room visualizer: hard per-conversation cap on AI renders (server-enforced).
alter table public.conversations
  add column visualizer_renders int not null default 0;
