-- Keep each publication target limited to the content shapes its provider can
-- actually accept. The application validates this too, but the database is the
-- final boundary for service-role writes and future automation jobs.
alter table public.content_publication_targets
  add constraint content_publication_targets_provider_content_types_check
  check (
    case provider
      when 'website' then content_types <@ array['article', 'video']::text[]
      when 'linkedin' then content_types <@ array['article', 'social_post', 'video']::text[]
      when 'facebook' then content_types <@ array['article', 'social_post', 'video']::text[]
      when 'instagram' then content_types <@ array['social_post', 'video']::text[]
      when 'youtube' then content_types <@ array['video']::text[]
      when 'tiktok' then content_types <@ array['video']::text[]
      else false
    end
  );
