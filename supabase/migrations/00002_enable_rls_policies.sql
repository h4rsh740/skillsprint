-- ============================================================================
-- SkillSprint AI — Enable Row Level Security on public tables
-- Filename: 00002_enable_rls_policies.sql
--
-- PURPOSE
--   Resolve the Supabase Security Advisor CRITICAL "RLS Disabled in Public"
--   (reported against public.profiles) by enabling RLS on every public table
--   and revoking the broad grants the PostgREST roles (anon / authenticated)
--   currently hold on all of them.
--
--   Idempotent & NON-DESTRUCTIVE. No tables dropped, no data deleted, no
--   schema columns changed, no auth providers touched.
--
-- ARCHITECTURE / OWNERSHIP MODEL (verified against the live database)
--   * Authentication is FIREBASE AUTH. Supabase Auth is unused; auth.users
--     has 0 rows. public.users.id holds the FIREBASE UID.
--   * The application reads/writes ONLY through the server-side PRISMA layer
--     (src/lib/prisma.ts -> src/lib/db.ts). The Prisma connection resolves to
--     the `postgres` role, which has rolbypassrls = TRUE, so application
--     queries are NOT affected by row level security.
--   * Ownership of public.profiles is expressed by the "userId" column
--     (text, references public.users.id). There is NO "user_id" column and
--     profile data is NOT keyed to Supabase auth.uid().
--   * Because no Supabase Auth identity exists, NO auth.uid()-based owner
--     policies are created. The correct, honest posture for the PostgREST
--     roles is DEFAULT-DENY (RLS enabled + no grant of row access). This
--     closes the real exposure (broad anon/authenticated DML grants with RLS
--     off) without pretending Firebase UIDs are Supabase auth UIDs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable ROW LEVEL SECURITY on all public data tables (default deny).
-- ---------------------------------------------------------------------------
alter table public._prisma_migrations    enable row level security;
alter table public.activity_logs         enable row level security;
alter table public.agent_actions         enable row level security;
alter table public.career_scores         enable row level security;
alter table public.career_twin           enable row level security;
alter table public.events                enable row level security;
alter table public.github_accounts       enable row level security;
alter table public.github_analysis       enable row level security;
alter table public.hackathon_matches     enable row level security;
alter table public.hackathons            enable row level security;
alter table public.job_applications      enable row level security;
alter table public.job_matches           enable row level security;
alter table public.jobs                  enable row level security;
alter table public.learning_progress     enable row level security;
alter table public.linkedin_accounts     enable row level security;
alter table public.linkedin_analysis     enable row level security;
alter table public.mentor_sessions       enable row level security;
alter table public.notifications         enable row level security;
alter table public.oauth_tokens          enable row level security;
alter table public.profiles              enable row level security;
alter table public.recommended_projects  enable row level security;
alter table public.resume_analysis       enable row level security;
alter table public.resume_files          enable row level security;
alter table public.roadmaps              enable row level security;
alter table public.saved_hackathons      enable row level security;
alter table public.sync_history          enable row level security;
alter table public.users                 enable row level security;
-- ---------------------------------------------------------------------------
-- 2. Revoke the over-broad grants held by the PostgREST roles so RLS default-
--    deny is effective even before any policy is consulted. Idempotent: a
--    REVOKE of a privilege the role does not hold simply reports NOTICE.
--    The application is unaffected (it connects as `postgres`, which owns the
--    objects and bypasses RLS; REVOKE does not apply to object owners).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    '_prisma_migrations','activity_logs','agent_actions','career_scores',
    'career_twin','events','github_accounts','github_analysis',
    'hackathon_matches','hackathons','job_applications','job_matches','jobs',
    'learning_progress','linkedin_accounts','linkedin_analysis',
    'mentor_sessions','notifications','oauth_tokens','profiles',
    'recommended_projects','resume_analysis','resume_files','roadmaps',
    'saved_hackathons','sync_history','users'
  ] loop
    execute format('REVOKE ALL ON public.%I FROM anon', t);
    execute format('REVOKE ALL ON public.%I FROM authenticated', t);
  end loop;
end $$;

-- ============================================================================
-- 3. OPT-OUT NOTES (do NOT un-comment blindly)
-- ----------------------------------------------------------------------------
-- (a) Public aggregate feed (hackathons / jobs), IF and only IF the product
--     intends to serve these through the PostgREST API to anonymous clients:
--
--     grant select on public.hackathons to anon, authenticated;
--     grant select on public.jobs      to anon, authenticated;
--     create policy "public_feed_select" on public.hackathons
--       for select to anon, authenticated using (true);
--     create policy "public_feed_select_jobs" on public.jobs
--       for select to anon, authenticated using (true);
--
--     The application does NOT read these through PostgREST (Prisma only), so
--     this option is left OFF to keep the strict default-deny posture.
--
-- (b) Owner-scoped policies keyed to (select auth.uid()) are intentionally
--     OMITTED. App users are Firebase-authenticated; their public.users.id is
--     a Firebase UID which never equals auth.uid(). Creating such policies
--     would be dishonest (they would match nothing) and misleading. If
--     Supabase Auth is adopted later, add UNIQUE(userId) FK to auth.users and
--     add policies of the form:
--         create policy "<t>_select_own" on public.<t>
--           for select to authenticated
--           using ((select auth.uid())::text = "userId");
--     plus matching insert/update/delete policies, and re-grant the needed
--     DML to the authenticated role at that time.
-- ============================================================================
