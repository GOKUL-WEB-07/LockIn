create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  onboarding_completed boolean not null default false,
  super_coins integer not null default 0 check (super_coins >= 0),
  selected_theme text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_name_length check (char_length(display_name) <= 60)
);

create table public.prebuilt_challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null,
  thumbnail_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.prebuilt_challenge_habits (
  id uuid primary key default gen_random_uuid(),
  prebuilt_challenge_id uuid not null references public.prebuilt_challenges(id) on delete cascade,
  name text not null,
  reminder_time time,
  sort_order integer not null default 0
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  type text not null default 'CUSTOM' check (type in ('CUSTOM','PREBUILT')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','COMPLETED','UNSUCCESSFUL','ARCHIVED')),
  source_template_id uuid references public.prebuilt_challenges(id),
  active_attempt_id uuid,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index one_active_custom_challenge on public.challenges(user_id) where status = 'ACTIVE' and type = 'CUSTOM';
create index challenges_user_status_idx on public.challenges(user_id, status);

create table public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid not null,
  attempt_number integer not null check (attempt_number >= 1),
  start_date date not null,
  end_date date,
  current_day integer not null default 1 check (current_day between 1 and 21),
  successful_days integer not null default 0 check (successful_days between 0 and 21),
  current_streak integer not null default 0 check (current_streak between 0 and 21),
  best_streak integer not null default 0 check (best_streak between 0 and 21),
  consecutive_misses integer not null default 0 check (consecutive_misses between 0 and 2),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','RESET','COMPLETED','UNSUCCESSFUL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges(id, user_id) on delete cascade,
  unique (challenge_id, attempt_number),
  unique (id, challenge_id, user_id)
);
create unique index one_active_attempt_per_challenge on public.challenge_attempts(challenge_id) where status = 'ACTIVE';
create index attempts_user_status_idx on public.challenge_attempts(user_id, status);
alter table public.challenges add constraint active_attempt_belongs_to_challenge
  foreign key (active_attempt_id, id, user_id) references public.challenge_attempts(id, challenge_id, user_id) deferrable initially deferred;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  reminder_time time,
  sort_order integer not null default 0,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges(id, user_id) on delete cascade,
  unique (id, challenge_id, user_id)
);
create index habits_challenge_order_idx on public.habits(challenge_id, sort_order);

create table public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  challenge_id uuid not null,
  user_id uuid not null,
  day_number integer not null check (day_number between 1 and 21),
  progress_date date not null,
  completed_habits integer not null default 0 check (completed_habits >= 0),
  total_habits integer not null check (total_habits > 0),
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  status text not null default 'IN_PROGRESS' check (status in ('UPCOMING','IN_PROGRESS','COMPLETED','MISSED')),
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (attempt_id, challenge_id, user_id) references public.challenge_attempts(id, challenge_id, user_id) on delete cascade,
  unique (attempt_id, day_number),
  check (completed_habits <= total_habits)
);
create index daily_progress_attempt_idx on public.daily_progress(attempt_id, day_number);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  attempt_id uuid not null,
  challenge_id uuid not null,
  user_id uuid not null,
  day_number integer not null check (day_number between 1 and 21),
  completion_date date not null,
  completed_at timestamptz not null default now(),
  foreign key (habit_id, challenge_id, user_id) references public.habits(id, challenge_id, user_id),
  foreign key (attempt_id, challenge_id, user_id) references public.challenge_attempts(id, challenge_id, user_id),
  unique (habit_id, attempt_id, day_number)
);
create index completions_attempt_day_idx on public.habit_completions(attempt_id, day_number);

create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid references public.challenges(id),
  attempt_id uuid references public.challenge_attempts(id),
  event_type text not null check (event_type in ('HABIT','DAY','STREAK','CHALLENGE')),
  coins integer not null check (coins > 0),
  unique_key text not null unique,
  created_at timestamptz not null default now()
);
create index rewards_user_idx on public.reward_events(user_id, created_at desc);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (category in ('THEME','PROFILE','CHALLENGE','INTERFACE')),
  price integer not null check (price >= 0),
  asset_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id),
  purchased_at timestamptz not null default now(),
  unique (user_id, shop_item_id)
);
create index user_items_user_idx on public.user_items(user_id);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  habit_reminders_enabled boolean not null default false,
  progress_reminders_enabled boolean not null default false,
  warning_notifications_enabled boolean not null default true,
  daily_result_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.notification_preferences(user_id) values (new.id);
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.habits enable row level security;
alter table public.daily_progress enable row level security;
alter table public.habit_completions enable row level security;
alter table public.reward_events enable row level security;
alter table public.user_items enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.prebuilt_challenges enable row level security;
alter table public.prebuilt_challenge_habits enable row level security;
alter table public.shop_items enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy challenges_read on public.challenges for select to authenticated using (user_id = (select auth.uid()));
create policy attempts_read on public.challenge_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy habits_read on public.habits for select to authenticated using (user_id = (select auth.uid()));
create policy daily_read on public.daily_progress for select to authenticated using (user_id = (select auth.uid()));
create policy completions_read on public.habit_completions for select to authenticated using (user_id = (select auth.uid()));
create policy rewards_read on public.reward_events for select to authenticated using (user_id = (select auth.uid()));
create policy items_read on public.user_items for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_read on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy templates_read on public.prebuilt_challenges for select to authenticated using (active);
create policy template_habits_read on public.prebuilt_challenge_habits for select to authenticated
  using (exists (select 1 from public.prebuilt_challenges p where p.id = prebuilt_challenge_id and p.active));
create policy shop_read on public.shop_items for select to authenticated using (active);

revoke all on public.profiles,public.challenges,public.challenge_attempts,public.habits,
  public.daily_progress,public.habit_completions,public.reward_events,public.user_items,
  public.notification_preferences,public.prebuilt_challenges,public.prebuilt_challenge_habits,
  public.shop_items from anon,authenticated;
grant select on public.profiles,public.challenges,public.challenge_attempts,public.habits,
  public.daily_progress,public.habit_completions,public.reward_events,public.user_items,
  public.notification_preferences,public.prebuilt_challenges,public.prebuilt_challenge_habits,
  public.shop_items to authenticated;

create function public.require_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  return v_user;
end $$;

create function public.local_today(p_timezone text) returns date language plpgsql stable security definer set search_path = '' as $$
declare v_today date;
begin
  begin v_today := (now() at time zone p_timezone)::date;
  exception when invalid_parameter_value then raise exception 'Invalid timezone'; end;
  return v_today;
end $$;

create function public.update_profile(p_name text, p_onboarding boolean default false) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.require_user(); v_row public.profiles;
begin
  if char_length(trim(p_name)) not between 1 and 60 then raise exception 'Name must be 1–60 characters'; end if;
  update public.profiles set display_name = trim(p_name), onboarding_completed = onboarding_completed or p_onboarding,
    updated_at = now() where id = v_user returning * into v_row;
  return v_row;
end $$;

create function public.create_challenge(p_name text, p_description text, p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.require_user(); v_id uuid;
begin
  if char_length(trim(p_name)) not between 1 and 80 or char_length(coalesce(p_description,'')) > 500 then
    raise exception 'Invalid challenge details'; end if;
  perform public.local_today(p_timezone);
  insert into public.challenges(user_id,name,description,timezone) values
    (v_user,trim(p_name),coalesce(p_description,''),p_timezone) returning id into v_id;
  return v_id;
end $$;

create function public.update_draft_challenge(p_id uuid, p_name text, p_description text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(trim(p_name)) not between 1 and 80 or char_length(coalesce(p_description,'')) > 500 then
    raise exception 'Invalid challenge details'; end if;
  update public.challenges set name = trim(p_name), description = coalesce(p_description,''), updated_at = now()
  where id = p_id and user_id = public.require_user() and status = 'DRAFT';
  if not found then raise exception 'Draft not found or locked'; end if;
end $$;

create function public.add_draft_habit(p_challenge uuid, p_name text, p_reminder time default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if char_length(trim(p_name)) not between 1 and 100 then raise exception 'Habit name must be 1–100 characters'; end if;
  perform 1 from public.challenges where id = p_challenge and user_id = public.require_user() and status = 'DRAFT' for update;
  if not found then raise exception 'Draft not found or locked'; end if;
  insert into public.habits(challenge_id,user_id,name,reminder_time,sort_order)
  values (p_challenge,public.require_user(),trim(p_name),p_reminder,
    (select coalesce(max(sort_order),0)+1 from public.habits where challenge_id = p_challenge)) returning id into v_id;
  return v_id;
end $$;

create function public.update_draft_habit(p_id uuid, p_name text, p_reminder time default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_challenge uuid;
begin
  if char_length(trim(p_name)) not between 1 and 100 then raise exception 'Habit name must be 1–100 characters'; end if;
  select challenge_id into v_challenge from public.habits where id = p_id and user_id = public.require_user();
  perform 1 from public.challenges where id = v_challenge and user_id = public.require_user() and status = 'DRAFT' for update;
  if not found then raise exception 'Draft not found or locked'; end if;
  update public.habits set name = trim(p_name), reminder_time = p_reminder, updated_at = now() where id = p_id;
end $$;

create function public.delete_draft_habit(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_challenge uuid;
begin
  select challenge_id into v_challenge from public.habits where id = p_id and user_id = public.require_user();
  perform 1 from public.challenges where id = v_challenge and user_id = public.require_user() and status = 'DRAFT' for update;
  if not found then raise exception 'Draft not found or locked'; end if;
  delete from public.habits where id = p_id;
end $$;

create function public.start_challenge(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_challenge public.challenges; v_attempt uuid;
begin
  select * into v_challenge from public.challenges where id = p_id and user_id = public.require_user() for update;
  if v_challenge.id is null or v_challenge.status <> 'DRAFT' then raise exception 'Draft not found or already started'; end if;
  if not exists (select 1 from public.habits where challenge_id = p_id) then raise exception 'Add at least one habit'; end if;
  if v_challenge.type = 'CUSTOM' and exists
    (select 1 from public.challenges where user_id = v_challenge.user_id and type = 'CUSTOM' and status = 'ACTIVE')
    then raise exception 'An active custom challenge already exists'; end if;
  insert into public.challenge_attempts(challenge_id,user_id,attempt_number,start_date)
    values (p_id,v_challenge.user_id,1,public.local_today(v_challenge.timezone)) returning id into v_attempt;
  update public.habits set locked = true where challenge_id = p_id;
  update public.challenges set status = 'ACTIVE', active_attempt_id = v_attempt, updated_at = now() where id = p_id;
  return v_attempt;
end $$;

create function public.grant_reward(p_user uuid,p_challenge uuid,p_attempt uuid,p_type text,p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_coins integer;
begin
  v_coins := case p_type when 'HABIT' then 1 when 'DAY' then 5 when 'STREAK' then 10 when 'CHALLENGE' then 100 else null end;
  if v_coins is null then raise exception 'Unknown reward type'; end if;
  insert into public.reward_events(user_id,challenge_id,attempt_id,event_type,coins,unique_key)
    values (p_user,p_challenge,p_attempt,p_type,v_coins,p_key) on conflict (unique_key) do nothing;
  if found then update public.profiles set super_coins = super_coins + v_coins, updated_at = now() where id = p_user; end if;
end $$;

create function public.reconcile_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_ch public.challenges; v_at public.challenge_attempts; v_today date; v_day integer;
  v_total integer; v_done integer; v_success boolean; v_last integer; v_pre_evaluated boolean;
begin
  select * into v_ch from public.challenges where id = p_challenge and user_id = public.require_user() for update;
  if v_ch.id is null then raise exception 'Challenge not found'; end if;
  if v_ch.status <> 'ACTIVE' then return; end if;
  select * into v_at from public.challenge_attempts where id = v_ch.active_attempt_id for update;
  v_today := public.local_today(v_ch.timezone);
  v_last := least(21, v_today - v_at.start_date);
  v_total := (select count(*) from public.habits where challenge_id = p_challenge);
  for v_day in (v_at.current_day)..v_last loop
    v_pre_evaluated := coalesce((select evaluated_at is not null from public.daily_progress
      where attempt_id=v_at.id and day_number=v_day),false);
    if not v_pre_evaluated then
      v_done := (select count(*) from public.habit_completions where attempt_id = v_at.id and day_number = v_day);
      v_success := v_done::numeric / v_total >= 0.75;
      insert into public.daily_progress(attempt_id,challenge_id,user_id,day_number,progress_date,completed_habits,total_habits,completion_percentage,status,evaluated_at)
        values (v_at.id,p_challenge,v_ch.user_id,v_day,v_at.start_date+(v_day-1),v_done,v_total,
          round(100.0*v_done/v_total,2),case when v_success then 'COMPLETED' else 'MISSED' end,now())
        on conflict (attempt_id,day_number) do update set completed_habits=excluded.completed_habits,
          completion_percentage=excluded.completion_percentage,status=excluded.status,evaluated_at=now(),updated_at=now()
        where public.daily_progress.evaluated_at is null;
      if v_success then
        v_at.successful_days := v_at.successful_days + 1;
        v_at.current_streak := v_at.current_streak + 1;
        v_at.best_streak := greatest(v_at.best_streak,v_at.current_streak);
        v_at.consecutive_misses := 0;
        perform public.grant_reward(v_ch.user_id,p_challenge,v_at.id,'DAY','day:'||v_at.id||':'||v_day);
        if v_at.current_streak in (7,14,21) then
          perform public.grant_reward(v_ch.user_id,p_challenge,v_at.id,'STREAK','streak:'||v_at.id||':'||v_at.current_streak);
        end if;
      else
        v_at.current_streak := 0;
        v_at.consecutive_misses := v_at.consecutive_misses + 1;
      end if;
    end if;
    if v_day = 21 then
      if v_at.successful_days >= 17 then
        v_at.status := 'COMPLETED'; v_ch.status := 'COMPLETED';
        perform public.grant_reward(v_ch.user_id,p_challenge,v_at.id,'CHALLENGE','challenge:'||v_at.id);
      else v_at.status := 'UNSUCCESSFUL'; v_ch.status := 'UNSUCCESSFUL'; end if;
      v_at.end_date := v_at.start_date + 20;
      update public.challenges set status=v_ch.status,active_attempt_id=null,updated_at=now() where id=p_challenge;
      update public.challenge_attempts set status=v_at.status,end_date=v_at.end_date,current_day=21,
        successful_days=v_at.successful_days,current_streak=v_at.current_streak,best_streak=v_at.best_streak,
        consecutive_misses=v_at.consecutive_misses,updated_at=now() where id=v_at.id;
      return;
    end if;
    if v_at.consecutive_misses = 2 then
      update public.challenge_attempts set status='RESET',end_date=v_at.start_date+(v_day-1),current_day=v_day,
        successful_days=v_at.successful_days,current_streak=0,best_streak=v_at.best_streak,
        consecutive_misses=2,updated_at=now() where id=v_at.id;
      insert into public.challenge_attempts(challenge_id,user_id,attempt_number,start_date)
        values (p_challenge,v_ch.user_id,v_at.attempt_number+1,v_today) returning id into v_ch.active_attempt_id;
      update public.challenges set active_attempt_id=v_ch.active_attempt_id,updated_at=now() where id=p_challenge;
      return;
    end if;
    v_at.current_day := v_day + 1;
    update public.challenge_attempts set current_day=v_at.current_day,successful_days=v_at.successful_days,
      current_streak=v_at.current_streak,best_streak=v_at.best_streak,
      consecutive_misses=v_at.consecutive_misses,updated_at=now() where id=v_at.id;
  end loop;
end $$;

create function public.complete_habit(p_habit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_habit public.habits; v_ch public.challenges; v_at public.challenge_attempts;
  v_day integer; v_total integer; v_done integer; v_today date;
begin
  select * into v_habit from public.habits where id=p_habit and user_id=public.require_user();
  if v_habit.id is null then raise exception 'Habit not found'; end if;
  perform public.reconcile_challenge(v_habit.challenge_id);
  select * into v_ch from public.challenges where id=v_habit.challenge_id for update;
  if v_ch.status <> 'ACTIVE' then raise exception 'Challenge is not active'; end if;
  select * into v_at from public.challenge_attempts where id=v_ch.active_attempt_id for update;
  v_today := public.local_today(v_ch.timezone);
  v_day := v_today - v_at.start_date + 1;
  if v_day not between 1 and 21 then raise exception 'No active challenge day'; end if;
  v_total := (select count(*) from public.habits where challenge_id=v_ch.id);
  insert into public.habit_completions(habit_id,attempt_id,challenge_id,user_id,day_number,completion_date)
    values (p_habit,v_at.id,v_ch.id,v_ch.user_id,v_day,v_today)
    on conflict (habit_id,attempt_id,day_number) do nothing;
  if found then perform public.grant_reward(v_ch.user_id,v_ch.id,v_at.id,'HABIT','habit:'||v_at.id||':'||v_day||':'||p_habit); end if;
  v_done := (select count(*) from public.habit_completions where attempt_id=v_at.id and day_number=v_day);
  insert into public.daily_progress(attempt_id,challenge_id,user_id,day_number,progress_date,completed_habits,total_habits,completion_percentage)
    values (v_at.id,v_ch.id,v_ch.user_id,v_day,v_today,v_done,v_total,round(100.0*v_done/v_total,2))
    on conflict (attempt_id,day_number) do update set completed_habits=excluded.completed_habits,
      completion_percentage=excluded.completion_percentage,updated_at=now()
      where public.daily_progress.status in ('IN_PROGRESS','COMPLETED');
  if v_done::numeric / v_total >= 0.75 then
    update public.daily_progress set status='COMPLETED',evaluated_at=now(),updated_at=now()
      where attempt_id=v_at.id and day_number=v_day and evaluated_at is null;
    if found then
      v_at.successful_days := v_at.successful_days + 1;
      v_at.current_streak := v_at.current_streak + 1;
      v_at.best_streak := greatest(v_at.best_streak,v_at.current_streak);
      update public.challenge_attempts set successful_days=v_at.successful_days,
        current_streak=v_at.current_streak,best_streak=v_at.best_streak,
        consecutive_misses=0,updated_at=now() where id=v_at.id;
      perform public.grant_reward(v_ch.user_id,v_ch.id,v_at.id,'DAY','day:'||v_at.id||':'||v_day);
      if v_at.current_streak in (7,14,21) then
        perform public.grant_reward(v_ch.user_id,v_ch.id,v_at.id,'STREAK','streak:'||v_at.id||':'||v_at.current_streak);
      end if;
    end if;
  end if;
end $$;

create function public.retry_challenge(p_challenge uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_ch public.challenges; v_attempt uuid; v_number integer;
begin
  select * into v_ch from public.challenges where id=p_challenge and user_id=public.require_user() for update;
  if v_ch.id is null or v_ch.status <> 'UNSUCCESSFUL' then raise exception 'Challenge is not retryable'; end if;
  if v_ch.type = 'CUSTOM' and exists (select 1 from public.challenges where user_id=v_ch.user_id and type='CUSTOM' and status='ACTIVE')
    then raise exception 'An active custom challenge already exists'; end if;
  select coalesce(max(attempt_number),0)+1 into v_number from public.challenge_attempts where challenge_id=p_challenge;
  insert into public.challenge_attempts(challenge_id,user_id,attempt_number,start_date)
    values (p_challenge,v_ch.user_id,v_number,public.local_today(v_ch.timezone)) returning id into v_attempt;
  update public.challenges set status='ACTIVE',active_attempt_id=v_attempt,updated_at=now() where id=p_challenge;
  return v_attempt;
end $$;

create function public.start_prebuilt(p_template uuid,p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_template public.prebuilt_challenges; v_challenge uuid; v_attempt uuid;
begin
  select * into v_template from public.prebuilt_challenges where id=p_template and active;
  if v_template.id is null then raise exception 'Program not found'; end if;
  perform public.local_today(p_timezone);
  insert into public.challenges(user_id,name,description,type,status,source_template_id,timezone)
    values (public.require_user(),v_template.name,v_template.description,'PREBUILT','DRAFT',p_template,p_timezone)
    returning id into v_challenge;
  insert into public.habits(challenge_id,user_id,name,reminder_time,sort_order)
    select v_challenge,public.require_user(),name,reminder_time,sort_order
      from public.prebuilt_challenge_habits where prebuilt_challenge_id=p_template;
  v_attempt := public.start_challenge(v_challenge);
  return v_challenge;
end $$;

create function public.purchase_shop_item(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_item public.shop_items; v_balance integer; v_user uuid := public.require_user();
begin
  select * into v_item from public.shop_items where id=p_item and active;
  if v_item.id is null then raise exception 'Item not found'; end if;
  select super_coins into v_balance from public.profiles where id=v_user for update;
  if exists (select 1 from public.user_items where user_id=v_user and shop_item_id=p_item) then raise exception 'Already owned'; end if;
  if v_balance < v_item.price then raise exception 'Insufficient coins'; end if;
  insert into public.user_items(user_id,shop_item_id) values (v_user,p_item);
  update public.profiles set super_coins=super_coins-v_item.price,updated_at=now() where id=v_user;
end $$;

create function public.set_notification_preferences(p_habit boolean,p_progress boolean,p_warning boolean,p_result boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_preferences set habit_reminders_enabled=p_habit,progress_reminders_enabled=p_progress,
    warning_notifications_enabled=p_warning,daily_result_enabled=p_result,updated_at=now()
    where user_id=public.require_user();
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.update_profile(text,boolean),public.create_challenge(text,text,text),
  public.update_draft_challenge(uuid,text,text),public.add_draft_habit(uuid,text,time),
  public.update_draft_habit(uuid,text,time),public.delete_draft_habit(uuid),public.start_challenge(uuid),
  public.reconcile_challenge(uuid),public.complete_habit(uuid),public.retry_challenge(uuid),
  public.start_prebuilt(uuid,text),public.purchase_shop_item(uuid),
  public.set_notification_preferences(boolean,boolean,boolean,boolean) to authenticated;
