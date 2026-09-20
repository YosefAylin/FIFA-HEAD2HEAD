-- ============================================================
-- Guest players ("count for the day, not for all time")
-- Run this in the Supabase SQL editor after schema.sql.
-- Adds an is_guest flag: guests play a single day and count in
-- that day's results + table, but are excluded from all-time
-- stats (leaderboard, career records, whisky odds).
-- Default is regular (false); existing rows become regulars.
-- ============================================================

alter table public.players
  add column if not exists is_guest boolean not null default false;
