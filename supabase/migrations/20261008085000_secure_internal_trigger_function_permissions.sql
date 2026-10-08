-- Rota da Justiça: remove public RPC execution permissions from trigger-only functions.
-- Applied to Supabase project ibbfwxqpowcwpuasxxdl on 2026-10-08.
-- Trigger execution continues through database triggers, not client RPC privileges.
revoke execute on function public.handle_new_game_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
