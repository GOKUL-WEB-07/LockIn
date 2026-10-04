-- Additional cosmetic themes. Purchases and ownership remain enforced by
-- purchase_shop_item and set_theme; the client never sets a price or balance.
insert into public.shop_items (id, name, description, category, price) values
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda003', 'Rose theme', 'A soft rose accent for your daily space.', 'THEME', 25),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda004', 'Sunset theme', 'A warm coral accent inspired by evening light.', 'THEME', 40),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda005', 'Sage theme', 'A quiet green accent with a grounded feel.', 'THEME', 60),
  ('b4afebc5-6db5-4a4b-a343-2b0c1cbda006', 'Amber theme', 'A golden accent for a little extra warmth.', 'THEME', 75)
on conflict (id) do nothing;
