-- Supabase ships pg_cron; the embedded PGlite test engine does not.
do $setup$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('lockin-hourly-reconciliation', '0 * * * *',
      'select public.reconcile_due_challenges(500)');
  end if;
end
$setup$;
