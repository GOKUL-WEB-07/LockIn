insert into public.prebuilt_challenges(id,name,description,category) values
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Morning Momentum','Begin each day with a short, repeatable routine.','Wellbeing'),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Deep Work','Build a focused work block and protect it daily.','Focus'),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Evening Reset','Close the day with clarity and make tomorrow easier.','Wellbeing');

insert into public.prebuilt_challenge_habits(prebuilt_challenge_id,name,sort_order) values
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Drink a glass of water after waking',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Move for 10 minutes',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Plan the top priority for today',3),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b001','Read for 10 minutes',4),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Choose one meaningful task',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Complete a 45-minute focus block',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b002','Record what distracted you',3),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Put away your workspace',1),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Write tomorrow’s first task',2),
  ('e1d19ba7-321c-4e54-9f19-8b615e42b003','Spend 10 minutes away from screens',3);

insert into public.shop_items(id,name,description,category,price) values
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda001','Ocean theme','A calm teal accent.','THEME',30),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda002','Violet theme','A rich violet accent.','THEME',50);

create function public.set_theme(p_item uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.require_user();
begin
  if p_item is not null and not exists (
    select 1 from public.user_items u join public.shop_items s on s.id = u.shop_item_id
    where u.user_id = v_user and u.shop_item_id = p_item and s.category = 'THEME'
  ) then raise exception 'Theme not owned'; end if;
  update public.profiles set selected_theme = coalesce(p_item::text,'default'),updated_at=now() where id=v_user;
end $$;
revoke execute on function public.set_theme(uuid) from public, anon;
grant execute on function public.set_theme(uuid) to authenticated;
