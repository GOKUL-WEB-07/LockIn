-- Call this from pg_cron or a trusted scheduled worker. Browser users cannot execute it.
create function public.reconcile_due_challenges(p_batch integer default 500) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_row record; v_count integer := 0; v_previous text;
begin
  if p_batch not between 1 and 1000 then raise exception 'Batch must be 1–1000'; end if;
  v_previous := current_setting('request.jwt.claim.sub',true);
  for v_row in
    select c.id, c.user_id from public.challenges c
    join public.challenge_attempts a on a.id=c.active_attempt_id
    where c.status='ACTIVE' and a.start_date + (a.current_day-1) < public.local_today(c.timezone)
    order by a.updated_at asc limit p_batch
  loop
    perform set_config('request.jwt.claim.sub',v_row.user_id::text,true);
    perform public.reconcile_challenge(v_row.id);
    v_count := v_count + 1;
  end loop;
  perform set_config('request.jwt.claim.sub',coalesce(v_previous,''),true);
  return v_count;
end $$;
revoke execute on function public.reconcile_due_challenges(integer) from public, anon, authenticated;
grant execute on function public.reconcile_due_challenges(integer) to service_role;
