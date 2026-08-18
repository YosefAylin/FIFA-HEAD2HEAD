-- ============================================================
-- Reset ALL data + seed the real "קובה של שבת" roster.
-- Run this in the Supabase SQL editor to wipe the default/old data
-- (players, matches, whiskey votes) and seed the 7 real players.
-- CAUTION: this permanently deletes all existing matches and votes.
-- ============================================================

-- 1. Delete dependent rows first (matches & votes reference players).
delete from whiskey_votes;
delete from matches;

-- 2. Clear all players (see players table).
delete from players;

-- 3. Insert the real roster. Names match the code roster exactly.
insert into players (name)
values
  ('יוסף'),
  ('ספי'),
  ('אשגרה'),
  ('זקי'),
  ('ליאור'),
  ('אבי י'),
  ('ישראל');

-- 4. Done. Verify:
select id, name, created_at from players order by created_at;