-- Local development only (`supabase start` / `supabase db reset` run this as
-- postgres after the migrations). The migration creates app_runtime without a
-- password; production sets one out of band (ADR 0026).
alter role app_runtime password 'app_runtime';
