-- RLS grants transcript access. These invoker triggers separately enforce the
-- paid handoff capability even for direct authenticated PostgREST writes.
create function public.guard_handoff_plan() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_bot uuid;
  v_status text;
  v_requested timestamptz;
  v_org public.organizations%rowtype;
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_table_name = 'messages' then
    if not coalesce(new.from_human,false) then return new; end if;
    select bot_id,handoff_status,handoff_requested_at into v_bot,v_status,v_requested
      from public.conversations where id=new.conversation_id;
  else
    if new.handoff_status not in ('requested','live') then return new; end if;
    v_bot := new.bot_id;
    v_status := old.handoff_status;
    v_requested := old.handoff_requested_at;
  end if;
  select o.* into v_org from public.organizations o join public.bots b on b.org_id=o.id where b.id=v_bot;
  if not found then raise exception 'Conversation access denied'; end if;
  if v_org.is_demo or v_org.is_platform or v_org.plan in ('basic','starter','growth','scale','enterprise') then return new; end if;
  if v_org.free_legacy and (v_org.free_policy_paused or v_org.free_policy_effective_at is null or now()<v_org.free_policy_effective_at) then return new; end if;
  if v_org.free_legacy and v_status='live' and v_requested < v_org.free_policy_effective_at
    and now()<v_org.free_policy_effective_at+interval '24 hours' then return new; end if;
  raise exception 'Live handoff requires Basic or above';
end;
$$;
revoke all on function public.guard_handoff_plan() from public,anon,authenticated;
create trigger conversations_guard_handoff before update of handoff_status on public.conversations
  for each row execute function public.guard_handoff_plan();
create trigger messages_guard_handoff before insert on public.messages
  for each row execute function public.guard_handoff_plan();
