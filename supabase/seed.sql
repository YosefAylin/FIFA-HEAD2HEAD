-- ============================================================
-- Seed data — the real "קובה של שבת" roster (7 players).
-- Idempotent: players insert on conflict do nothing.
-- Use reset-and-seed.sql to wipe old/default data first.
-- ============================================================

insert into players (name)
values
  ('יוסף'),
  ('ספי'),
  ('אשגרה'),
  ('זקי'),
  ('ליאור'),
  ('אבי י'),
  ('ישראל')
on conflict (name) do nothing;

-- Matches are intentionally left empty: games are entered live from the app.
select id, name from players order by created_at;