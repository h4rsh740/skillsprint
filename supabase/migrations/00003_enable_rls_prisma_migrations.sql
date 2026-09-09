-- ============================================================================
-- SkillSprint AI — Enable RLS on Prisma migration bookkeeping table
-- Filename: 00003_enable_rls_prisma_migrations.sql
--
-- PURPOSE
--   Clears the final Supabase Security Advisor flag:
--   "RLS Disabled in Public" -> public._prisma_migrations
--
--   Non-destructive, idempotent. Only touches public._prisma_migrations.
--   * Enables RLS on the table.
--   * Revokes any anon/authenticated grants (none remain today).
--   * Forces RLS so even the table-owner role hits RLS (the application's
--     Prisma connection uses the `postgres` role, which has rolbypassrls=true,
--     so application/migration access is NOT affected).
--
--   Does NOT: change Prisma, change Firebase Auth, add SELECT policies,
--   alter/delete migration records, or touch any application table.
-- ============================================================================

alter table public._prisma_migrations enable row level security;

-- Idempotent: no-op if already revoked (NOTICE only).
revoke all on public._prisma_migrations from anon;
revoke all on public._prisma_migrations from authenticated;

-- Hardening: apply RLS to the table owner as well. The `postgres` role used
-- by Prisma has rolbypassrls=true so migrations keep working.
alter table public._prisma_migrations force row level security;