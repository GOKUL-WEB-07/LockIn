-- Equipable cosmetics are independent of theme selection and never alter rewards.
alter table public.profiles
  add column if not exists selected_profile_item_id uuid references public.shop_items(id) on delete set null,
  add column if not exists selected_interface_item_id uuid references public.shop_items(id) on delete set null;

insert into public.shop_items (id, name, description, category, price) values
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda007', 'Comet badge', 'A bright little comet beside your name.', 'PROFILE', 20),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda008', 'Champion badge', 'A trophy for the work you keep doing.', 'PROFILE', 45),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda009', 'Aurora glow', 'A flowing glow across your challenge card.', 'INTERFACE', 35),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda010', 'Stardust', 'A quiet constellation in your dashboard.', 'INTERFACE', 55)
on conflict (id) do nothing;

create or replace function public.set_cosmetic(p_item uuid, p_category text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.require_user();
begin
  if p_category not in ('PROFILE', 'INTERFACE') then
    raise exception 'Invalid cosmetic category';
  end if;
  if p_item is not null and not exists (
    select 1 from public.user_items u
    join public.shop_items s on s.id = u.shop_item_id
    where u.user_id = v_user and u.shop_item_id = p_item
      and s.category = p_category and s.active
  ) then
    raise exception 'Cosmetic not owned';
  end if;
  if p_category = 'PROFILE' then
    update public.profiles set selected_profile_item_id = p_item, updated_at = now() where id = v_user;
  else
    update public.profiles set selected_interface_item_id = p_item, updated_at = now() where id = v_user;
  end if;
end $$;
revoke execute on function public.set_cosmetic(uuid,text) from public, anon;
grant execute on function public.set_cosmetic(uuid,text) to authenticated;
