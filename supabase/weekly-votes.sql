-- ============================================================
-- Weekly whiskey votes: one vote per device per WEEK (was per day),
-- and voters can change their vote within the same week.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- 1) Collapse any duplicate (voter_token, week_start_date) rows that
--    accumulated while the old daily constraint was in force — keep the
--    most recent vote. Only the newest row per device+week stays.
delete from public.whiskey_votes w
  using public.whiskey_votes w2
  where w.voter_token = w2.voter_token
    and w.week_start_date = w2.week_start_date
    and w.created_at < w2.created_at;

-- 2) Drop the daily unique index and replace it with the weekly one.
alter table public.whiskey_votes
  drop constraint if exists whiskey_votes_voter_token_vote_date_key;
alter table public.whiskey_votes
  add constraint whiskey_votes_voter_token_week_start_date_key
    unique (voter_token, week_start_date);