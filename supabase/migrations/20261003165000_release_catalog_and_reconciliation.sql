insert into public.prebuilt_challenges(id,name,description,category) values
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Morning Momentum','Begin each day with a short, repeatable routine.','Wellbeing'),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Deep Work','Build a focused work block and protect it daily.','Focus'),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Evening Reset','Close the day with clarity and make tomorrow easier.','Wellbeing') on conflict (id) do nothing;

insert into public.prebuilt_challenge_habits(prebuilt_challenge_id,name,sort_order) select v.program::uuid,v.name,v.position from (values
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Drink a glass of water after waking',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Move for 10 minutes',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Plan the top priority for today',3),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Read for 10 minutes',4),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Choose one meaningful task',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Complete a 45-minute focus block',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Record what distracted you',3),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Put away your workspace',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Write tomorrow’s first task',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Spend 10 minutes away from screens',3)) as v(program,name,position) where not exists (select 1 from public.prebuilt_challenge_habits h where h.prebuilt_challenge_id=v.program::uuid and h.sort_order=v.position);

insert into public.shop_items(id,name,description,category,price) values
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda001','Ocean theme','A calm teal accent.','THEME',30),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda002','Violet theme','A rich violet accent.','THEME',50) on conflict (id) do nothing;

-- Call this from pg_cron or a trusted scheduled worker. Browser users cannot execute it.
create or replace function public.reconcile_due_challenges(p_batch integer default 500) returns integer
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

