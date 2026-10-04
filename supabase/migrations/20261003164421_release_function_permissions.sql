-- Hosted Supabase grants EXECUTE directly to authenticated through default ACLs.
-- Revoking PUBLIC alone does not remove those independent role grants.
revoke execute on function public.grant_reward(uuid,uuid,uuid,text,text),
  public.handle_new_user(), public.local_today(text), public.require_user()
  from public, anon, authenticated;
