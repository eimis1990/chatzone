-- Restore the standard salutation omitted from the 2026-07-29 researched batch.
-- This changes prepared copy only; lifecycle timestamps must remain untouched.
update public.sales_leads
set email_body = E'Laba diena,\n\n' || email_body
where source like 'Pirmojo šaltinio patikra 2026-07-29:%'
  and email_body is not null
  and btrim(email_body) <> ''
  and email_body not like 'Laba diena,%';

do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from public.sales_leads
  where source like 'Pirmojo šaltinio patikra 2026-07-29:%'
    and email_body is not null
    and email_body not like 'Laba diena,%';

  if missing_count <> 0 then
    raise exception
      'Expected every researched lead email to start with the salutation; % still missing',
      missing_count;
  end if;
end
$$;
