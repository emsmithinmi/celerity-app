-- Harden existing database helpers without changing their behavior.

alter function public.update_updated_at()
  set search_path = public, pg_temp;

alter function public.mark_stale_people()
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

-- This event-trigger helper is not an application RPC. It is invoked by the
-- database event trigger and must not be exposed through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
