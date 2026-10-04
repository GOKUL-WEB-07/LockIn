create or replace function public.set_theme(p_item uuid default null) returns void
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
