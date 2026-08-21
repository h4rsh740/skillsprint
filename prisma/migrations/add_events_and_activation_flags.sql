-- Migration: add_events_and_activation_flags
-- Generated: 2026-08-18
-- Apply this in Supabase SQL editor: https://supabase.com/dashboard → SQL Editor
-- Run these statements in order.

-- 1. Add activation flag columns to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "resumeUploaded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "githubIngested"  BOOLEAN NOT NULL DEFAULT false;

-- 2. Create events table
CREATE TABLE IF NOT EXISTS "events" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "eventType" TEXT        NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS "events_userId_eventType_idx" ON "events"("userId", "eventType");
CREATE INDEX IF NOT EXISTS "events_eventType_createdAt_idx" ON "events"("eventType", "createdAt");

-- 4. Add foreign key
ALTER TABLE "events"
  ADD CONSTRAINT "events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
